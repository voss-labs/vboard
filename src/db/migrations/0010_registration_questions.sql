ALTER TABLE "post" ADD COLUMN "registration_questions" jsonb DEFAULT '[]'::jsonb NOT NULL;
ALTER TABLE "registration" ADD COLUMN "answers" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "post" ADD CONSTRAINT "post_questions_shape" CHECK (jsonb_typeof(registration_questions) = 'array' AND (is_event OR registration_questions = '[]'::jsonb));
ALTER TABLE "registration" ADD CONSTRAINT "registration_answers_shape" CHECK (jsonb_typeof(answers) = 'object');
CREATE FUNCTION vboard_api.valid_questions(questions jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,pg_temp AS $$
DECLARE q jsonb; ids text[]:='{}';
BEGIN
  IF jsonb_typeof(questions) IS DISTINCT FROM 'array' OR jsonb_array_length(questions)>10 THEN RETURN false; END IF;
  FOR q IN SELECT e FROM jsonb_array_elements(questions) e LOOP
    IF jsonb_typeof(q) IS DISTINCT FROM 'object' OR jsonb_typeof(q->'id') IS DISTINCT FROM 'string'
      OR (q->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR (q->>'id')=ANY(ids)
      OR jsonb_typeof(q->'label') IS DISTINCT FROM 'string' OR btrim(q->>'label')='' OR char_length(q->>'label')>200
      OR jsonb_typeof(q->'required') IS DISTINCT FROM 'boolean' THEN RETURN false; END IF;
    ids:=ids||(q->>'id');
    IF q->>'type'='choice' THEN
      IF jsonb_typeof(q->'options') IS DISTINCT FROM 'array' OR jsonb_array_length(q->'options') NOT BETWEEN 2 AND 12
        OR EXISTS (SELECT 1 FROM jsonb_array_elements(q->'options') o WHERE jsonb_typeof(o) IS DISTINCT FROM 'string'
          OR btrim(o#>>'{}')='' OR char_length(o#>>'{}')>100)
        OR (SELECT count(DISTINCT o) FROM jsonb_array_elements_text(q->'options') o)<>jsonb_array_length(q->'options') THEN
        RETURN false; END IF;
    ELSIF q->>'type'='text' THEN
      IF jsonb_typeof(q->'minWords') IS DISTINCT FROM 'number' OR jsonb_typeof(q->'maxWords') IS DISTINCT FROM 'number'
        OR (q->>'maxWords')::numeric NOT BETWEEN 1 AND 1000
        OR (q->>'minWords')::numeric NOT BETWEEN 0 AND (q->>'maxWords')::numeric
        OR (q->>'minWords')::numeric%1<>0 OR (q->>'maxWords')::numeric%1<>0 THEN RETURN false; END IF;
    ELSE RETURN false; END IF;
  END LOOP;
  RETURN true;
END $$;
CREATE FUNCTION vboard_api.valid_answers(questions jsonb,answers jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,pg_temp AS $$
DECLARE q jsonb; answer text; words integer;
BEGIN
  IF jsonb_typeof(answers) IS DISTINCT FROM 'object' OR EXISTS (SELECT 1 FROM jsonb_each(answers) a
    WHERE jsonb_typeof(a.value) IS DISTINCT FROM 'string'
      OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(questions) k WHERE k->>'id'=a.key)) THEN RETURN false; END IF;
  FOR q IN SELECT e FROM jsonb_array_elements(questions) e LOOP
    answer:=answers->>(q->>'id');
    IF answer IS NULL THEN
      IF (q->>'required')::boolean THEN RETURN false; END IF;
      CONTINUE;
    END IF;
    IF answer='' OR answer<>btrim(answer,E' \n') OR char_length(answer)>20000 THEN RETURN false; END IF;
    IF q->>'type'='choice' THEN
      IF NOT (q->'options') ? answer THEN RETURN false; END IF;
    ELSE
      words:=cardinality(regexp_split_to_array(answer,E'[ \n]+'));
      IF words<(q->>'minWords')::integer OR words>(q->>'maxWords')::integer THEN RETURN false; END IF;
    END IF;
  END LOOP;
  RETURN true;
END $$;
CREATE OR REPLACE FUNCTION vboard_api.guard_post() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE occupied integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.id::text,0));
  IF NOT vboard_api.operates(NEW.community_id) THEN RAISE EXCEPTION 'Post access denied' USING ERRCODE='42501'; END IF;
  IF NOT vboard_api.valid_questions(NEW.registration_questions) THEN
    RAISE EXCEPTION 'Registration questions are invalid' USING ERRCODE='23514'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.author_id IS DISTINCT FROM vboard_api.actor_id() THEN RAISE EXCEPTION 'Author mismatch' USING ERRCODE='42501'; END IF;
    NEW.created_at=clock_timestamp();
  ELSE
    IF (NEW.id,NEW.community_id,NEW.author_id,NEW.created_at,NEW.slug) IS DISTINCT FROM
      (OLD.id,OLD.community_id,OLD.author_id,OLD.created_at,OLD.slug) THEN
      RAISE EXCEPTION 'Post identity is immutable' USING ERRCODE='42501'; END IF;
    IF NOT NEW.is_event AND EXISTS (SELECT 1 FROM public.registration r WHERE r.post_id=NEW.id) THEN
      RAISE EXCEPTION 'An event with registrations cannot become an announcement'; END IF;
    IF NEW.registration_questions IS DISTINCT FROM OLD.registration_questions
      AND EXISTS (SELECT 1 FROM public.registration r WHERE r.post_id=NEW.id)
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(OLD.registration_questions) o WHERE NOT EXISTS
        (SELECT 1 FROM jsonb_array_elements(NEW.registration_questions) n WHERE n->>'id'=o->>'id' AND n->>'type'=o->>'type'
          AND coalesce(n->'options','[]'::jsonb) @> coalesce(o->'options','[]'::jsonb))) THEN
      RAISE EXCEPTION 'Answered questions cannot be removed' USING ERRCODE='23514'; END IF;
  END IF;
  SELECT count(*)::int INTO occupied FROM public.registration r WHERE r.post_id=NEW.id AND r.status IN ('approved','attended');
  IF NEW.capacity IS NOT NULL AND NEW.capacity < occupied THEN RAISE EXCEPTION 'Capacity is below occupied seats'; END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION vboard_api.guard_registration() RETURNS trigger
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE event public.post%ROWTYPE; actor text:=vboard_api.actor_id(); retry boolean; occupied integer; closes timestamptz;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.post_id::text,0));
  SELECT * INTO event FROM public.post p WHERE p.id=NEW.post_id;
  IF NOT FOUND OR NOT event.is_event THEN RAISE EXCEPTION 'Registrations require an event'; END IF;
  IF TG_OP='UPDATE' AND (NEW.id,NEW.post_id,NEW.user_id) IS DISTINCT FROM (OLD.id,OLD.post_id,OLD.user_id) THEN
    RAISE EXCEPTION 'Registration identity is immutable' USING ERRCODE='42501'; END IF;
  retry:=TG_OP='INSERT' OR (TG_OP='UPDATE' AND OLD.status='cancelled' AND NEW.user_id=actor);
  IF retry THEN
    closes:=coalesce(event.registration_closes_at,event.ends_at,event.starts_at);
    IF NEW.user_id IS DISTINCT FROM actor OR NOT vboard_api.visible(event.id) OR
      (event.registration_opens_at IS NOT NULL AND clock_timestamp()<event.registration_opens_at) OR
      (closes IS NOT NULL AND clock_timestamp()>closes) OR
      NEW.status::text IS DISTINCT FROM (CASE WHEN event.requires_approval THEN 'pending' ELSE 'approved' END) OR
      NEW.decided_by IS NOT NULL OR NEW.decided_at IS NOT NULL OR NEW.checked_in_at IS NOT NULL THEN
      RAISE EXCEPTION 'Registration is not available' USING ERRCODE='42501'; END IF;
    IF NOT vboard_api.valid_answers(event.registration_questions,NEW.answers) THEN
      RAISE EXCEPTION 'Registration answers are invalid' USING ERRCODE='23514'; END IF;
    NEW.registered_at=clock_timestamp();
  ELSIF NEW.answers IS DISTINCT FROM OLD.answers THEN
    RAISE EXCEPTION 'Registration answers are immutable' USING ERRCODE='42501';
  ELSIF NEW.user_id=actor AND OLD.status IN ('pending','approved') AND NEW.status='cancelled' THEN
    IF (NEW.decided_by,NEW.decided_at,NEW.checked_in_at,NEW.registered_at) IS DISTINCT FROM
      (OLD.decided_by,OLD.decided_at,OLD.checked_in_at,OLD.registered_at) THEN
      RAISE EXCEPTION 'Cancellation provenance is immutable' USING ERRCODE='42501'; END IF;
  ELSE
    IF NOT vboard_api.event_operator(NEW.post_id) OR NEW.registered_at IS DISTINCT FROM OLD.registered_at OR
      NEW.decided_by IS DISTINCT FROM actor OR NOT (
        (OLD.status IN ('pending','rejected') AND NEW.status='approved') OR
        (OLD.status IN ('pending','approved') AND NEW.status='rejected') OR
        (OLD.status IN ('approved','no_show') AND NEW.status='attended') OR
        (OLD.status='approved' AND NEW.status='no_show') OR
        (OLD.status IN ('attended','no_show') AND NEW.status='approved')) THEN
      RAISE EXCEPTION 'Registration transition denied' USING ERRCODE='42501'; END IF;
    NEW.decided_by=actor; NEW.decided_at=clock_timestamp();
    NEW.checked_in_at=CASE WHEN NEW.status='attended' THEN clock_timestamp() ELSE NULL END;
  END IF;
  IF NEW.status IN ('approved','attended') AND (TG_OP='INSERT' OR OLD.status NOT IN ('approved','attended')) THEN
    SELECT count(*)::int INTO occupied FROM public.registration r WHERE r.post_id=NEW.post_id
      AND r.status IN ('approved','attended') AND r.id<>NEW.id;
    IF event.capacity IS NOT NULL AND occupied>=event.capacity THEN RAISE EXCEPTION 'Event is full' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION vboard_api.post_projection(post_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
  SELECT jsonb_build_object(
    'id',p.id,'slug',p.slug,'title',p.title,'body',p.body,'imageUrl',p.image_url,
    'visibility',p.visibility,'isPinned',p.is_pinned,'status',p.status,'isEvent',p.is_event,
    'isActive',p.is_active,'startsAt',p.starts_at,'endsAt',p.ends_at,
    'location',CASE WHEN p.location_visibility='public' OR vboard_api.operates(p.community_id)
      OR EXISTS (SELECT 1 FROM public.registration r WHERE r.post_id=p.id AND r.user_id=vboard_api.actor_id()
        AND r.status IN ('approved','attended')) THEN p.location ELSE NULL END,
    'locationVisibility',p.location_visibility,'registrationOpensAt',p.registration_opens_at,
    'registrationClosesAt',p.registration_closes_at,'capacity',p.capacity,'requiresApproval',p.requires_approval,
    'registrationQuestions',p.registration_questions,
    'createdAt',p.created_at,'updatedAt',p.updated_at,'communityId',c.id,'communitySlug',c.slug,
    'communityName',c.name,'authorName',u.name,'authorImage',u.image,
    'seatsTaken',(SELECT count(*)::int FROM public.registration r WHERE r.post_id=p.id AND r.status IN ('approved','attended')),
    'pendingCount',CASE WHEN vboard_api.operates(p.community_id) THEN
      (SELECT count(*)::int FROM public.registration r WHERE r.post_id=p.id AND r.status='pending') ELSE 0 END)
  FROM public.post p JOIN public.community c ON c.id=p.community_id LEFT JOIN public."user" u ON u.id=p.author_id
  WHERE p.id=post_projection.post_id AND (vboard_api.visible(p.id) OR (p.is_active AND vboard_api.operates(p.community_id)))
$$;
CREATE OR REPLACE FUNCTION vboard_api.event_attendees(post_id uuid) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF NOT vboard_api.event_operator(post_id) THEN RAISE EXCEPTION 'Attendee access denied' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT jsonb_build_object('id',r.id,'status',r.status,'registeredAt',r.registered_at,
    'checkedInAt',r.checked_in_at,'userId',u.id,'name',u.name,'email',u.email,
    'rollNumber',p.roll_number,'department',p.department,'answers',r.answers)
  FROM public.registration r JOIN public."user" u ON u.id=r.user_id LEFT JOIN public.profile p ON p.user_id=u.id
  WHERE r.post_id=event_attendees.post_id ORDER BY r.registered_at;
END $$;
CREATE OR REPLACE FUNCTION vboard_api.registration_event(post_id uuid) RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
  SELECT jsonb_build_object('communityId',p.community_id,'requiresApproval',p.requires_approval,
    'questions',p.registration_questions)
  FROM public.post p WHERE p.id=registration_event.post_id AND p.is_event AND
    (vboard_api.visible(p.id) OR vboard_api.event_operator(p.id) OR EXISTS
      (SELECT 1 FROM public.registration r WHERE r.post_id=p.id AND r.user_id=vboard_api.actor_id()))
$$;
ALTER FUNCTION vboard_api.valid_questions(jsonb) OWNER TO vboard_guard;
ALTER FUNCTION vboard_api.valid_answers(jsonb,jsonb) OWNER TO vboard_guard;
REVOKE ALL ON FUNCTION vboard_api.valid_questions(jsonb),vboard_api.valid_answers(jsonb,jsonb) FROM PUBLIC,vboard_app;
