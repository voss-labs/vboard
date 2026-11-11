CREATE TYPE "public"."community_request_status" AS ENUM('pending', 'approved', 'rejected', 'withdrawn');
CREATE TABLE "community_request" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "requester_id" text NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "purpose" text NOT NULL,
  "status" "community_request_status" DEFAULT 'pending' NOT NULL,
  "community_id" uuid,
  "decided_by" text,
  "decided_at" timestamp with time zone,
  "decision_note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "community_request" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "community_request" ADD CONSTRAINT "community_request_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "community_request" ADD CONSTRAINT "community_request_community_id_community_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."community"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "community_request" ADD CONSTRAINT "community_request_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;
CREATE UNIQUE INDEX "community_request_one_pending" ON "community_request" USING btree ("requester_id") WHERE "community_request"."status" = 'pending';
CREATE INDEX "community_request_status_idx" ON "community_request" USING btree ("status","created_at");
CREATE POLICY "guard_read" ON "community_request" AS PERMISSIVE FOR SELECT TO "vboard_guard" USING (true);
CREATE POLICY "community_request_select" ON "community_request" AS PERMISSIVE FOR SELECT TO "vboard_app" USING (requester_id=vboard_api.actor_id() OR vboard_api.is_super_admin());
CREATE POLICY "community_request_insert" ON "community_request" AS PERMISSIVE FOR INSERT TO "vboard_app" WITH CHECK (requester_id=vboard_api.actor_id());
CREATE POLICY "community_request_update" ON "community_request" AS PERMISSIVE FOR UPDATE TO "vboard_app" USING (requester_id=vboard_api.actor_id() OR vboard_api.is_super_admin()) WITH CHECK (requester_id=vboard_api.actor_id() OR vboard_api.is_super_admin());
ALTER TABLE public.community_request ADD CONSTRAINT community_request_text_bounds CHECK (
  char_length(btrim(name)) BETWEEN 2 AND 80 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 60 AND
  char_length(description) <= 600 AND char_length(btrim(purpose)) BETWEEN 20 AND 600 AND
  (decision_note IS NULL OR char_length(decision_note) <= 400));
ALTER TABLE public.community_request FORCE ROW LEVEL SECURITY;
GRANT SELECT ON public.community_request TO vboard_guard;
GRANT SELECT, INSERT, UPDATE ON public.community_request TO vboard_app;
CREATE FUNCTION vboard_api.guard_community_request() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.requester_id IS DISTINCT FROM vboard_api.actor_id() THEN
      RAISE EXCEPTION 'Community request access denied' USING ERRCODE='42501'; END IF;
    IF NEW.status<>'pending' OR NEW.community_id IS NOT NULL OR NEW.decided_by IS NOT NULL OR NEW.decided_at IS NOT NULL
      OR NEW.decision_note IS NOT NULL THEN
      RAISE EXCEPTION 'A community request starts pending' USING ERRCODE='42501'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id=NEW.requester_id AND u.email_verified AND lower(u.email) LIKE '%@vit.edu.in') THEN
      RAISE EXCEPTION 'Invalid requester'; END IF;
    IF EXISTS (SELECT 1 FROM public.community c WHERE c.slug=NEW.slug) THEN
      RAISE EXCEPTION 'That community address is taken'; END IF;
    NEW.created_at=clock_timestamp();
    RETURN NEW;
  END IF;
  IF (NEW.id,NEW.requester_id,NEW.name,NEW.slug,NEW.description,NEW.purpose,NEW.created_at) IS DISTINCT FROM
    (OLD.id,OLD.requester_id,OLD.name,OLD.slug,OLD.description,OLD.purpose,OLD.created_at) THEN
    RAISE EXCEPTION 'Community request details are immutable' USING ERRCODE='42501'; END IF;
  IF OLD.status<>'pending' THEN RAISE EXCEPTION 'This community request is already closed'; END IF;
  IF NEW.status='withdrawn' THEN
    IF OLD.requester_id IS DISTINCT FROM vboard_api.actor_id() OR NEW.community_id IS NOT NULL OR NEW.decided_by IS NOT NULL
      OR NEW.decided_at IS NOT NULL OR NEW.decision_note IS NOT NULL THEN
      RAISE EXCEPTION 'Community request change denied' USING ERRCODE='42501'; END IF;
  ELSIF NEW.status IN ('approved','rejected') THEN
    IF NOT vboard_api.is_super_admin() OR NEW.decided_by IS DISTINCT FROM vboard_api.actor_id() THEN
      RAISE EXCEPTION 'Community request decision denied' USING ERRCODE='42501'; END IF;
    IF NEW.status='approved' AND NOT EXISTS (SELECT 1 FROM public.community c JOIN public.community_member m ON m.community_id=c.id
      WHERE c.id=NEW.community_id AND c.slug=NEW.slug AND m.user_id=NEW.requester_id AND m.role='lead' AND m.is_active) THEN
      RAISE EXCEPTION 'An approved request names the community its requester leads'; END IF;
    IF NEW.status='rejected' AND NEW.community_id IS NOT NULL THEN
      RAISE EXCEPTION 'A rejected request has no community'; END IF;
    NEW.decided_at=clock_timestamp();
  ELSE
    RAISE EXCEPTION 'Invalid community request change' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
CREATE FUNCTION vboard_api.community_requests() RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF NOT vboard_api.is_super_admin() THEN RAISE EXCEPTION 'Community request access denied' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT jsonb_build_object('id',q.id,'name',q.name,'slug',q.slug,'description',q.description,'purpose',q.purpose,
    'status',q.status,'createdAt',q.created_at,'requesterName',u.name,'requesterEmail',u.email,
    'slugTaken',EXISTS (SELECT 1 FROM public.community c WHERE c.slug=q.slug))
  FROM public.community_request q JOIN public."user" u ON u.id=q.requester_id
  WHERE q.status='pending' ORDER BY q.created_at;
END $$;
CREATE OR REPLACE FUNCTION vboard_api.audit_allowed(target_type text,target_id text,community_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT vboard_api.is_super_admin() OR
    (audit_allowed.target_type='profile' AND audit_allowed.target_id=vboard_api.actor_id() AND audit_allowed.community_id IS NULL) OR
    (audit_allowed.target_type='community_request' AND audit_allowed.community_id IS NULL AND EXISTS (SELECT 1 FROM public.community_request q
      WHERE q.id::text=audit_allowed.target_id AND q.requester_id=vboard_api.actor_id())) OR
    (audit_allowed.target_type='community' AND audit_allowed.target_id=audit_allowed.community_id::text AND vboard_api.leads(audit_allowed.community_id)) OR
    (audit_allowed.target_type='member' AND EXISTS (SELECT 1 FROM public.community_member m WHERE m.id::text=audit_allowed.target_id AND m.community_id=audit_allowed.community_id AND vboard_api.leads(m.community_id))) OR
    (audit_allowed.target_type='post' AND EXISTS (SELECT 1 FROM public.post p WHERE p.id::text=audit_allowed.target_id AND p.community_id=audit_allowed.community_id AND vboard_api.operates(p.community_id))) OR
    (audit_allowed.target_type='registration' AND EXISTS (SELECT 1 FROM public.registration r JOIN public.post p ON p.id=r.post_id WHERE r.id::text=audit_allowed.target_id
      AND p.community_id=audit_allowed.community_id AND (r.user_id=vboard_api.actor_id() OR vboard_api.event_operator(p.id))))
$$;
ALTER FUNCTION vboard_api.guard_community_request() OWNER TO vboard_guard;
ALTER FUNCTION vboard_api.community_requests() OWNER TO vboard_guard;
REVOKE ALL ON FUNCTION vboard_api.guard_community_request(),vboard_api.community_requests() FROM PUBLIC,vboard_app,vboard_auth;
GRANT EXECUTE ON FUNCTION vboard_api.community_requests() TO vboard_app;
CREATE TRIGGER community_request_guard BEFORE INSERT OR UPDATE ON public.community_request FOR EACH ROW EXECUTE FUNCTION vboard_api.guard_community_request();
CREATE TRIGGER community_request_updated BEFORE INSERT OR UPDATE ON public.community_request FOR EACH ROW EXECUTE FUNCTION vboard_api.touch_updated_at();
