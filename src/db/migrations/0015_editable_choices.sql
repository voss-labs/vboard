CREATE OR REPLACE FUNCTION vboard_api.valid_questions(questions jsonb) RETURNS boolean
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
        OR EXISTS (SELECT 1 FROM jsonb_array_elements(q->'options') o WHERE jsonb_typeof(o) IS DISTINCT FROM 'object'
          OR jsonb_typeof(o->'id') IS DISTINCT FROM 'string'
          OR (o->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          OR jsonb_typeof(o->'label') IS DISTINCT FROM 'string' OR btrim(o->>'label')='' OR char_length(o->>'label')>100)
        OR (SELECT count(DISTINCT lower(o->>'id')) FROM jsonb_array_elements(q->'options') o)<>jsonb_array_length(q->'options')
        OR (SELECT count(DISTINCT o->>'label') FROM jsonb_array_elements(q->'options') o)<>jsonb_array_length(q->'options') THEN
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
CREATE OR REPLACE FUNCTION vboard_api.valid_answers(questions jsonb,answers jsonb) RETURNS boolean
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
      IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(q->'options') o WHERE o->>'id'=answer) THEN RETURN false; END IF;
    ELSE
      words:=cardinality(regexp_split_to_array(answer,E'[ \n]+'));
      IF words<(q->>'minWords')::integer OR words>(q->>'maxWords')::integer THEN RETURN false; END IF;
    END IF;
  END LOOP;
  RETURN true;
END $$;
ALTER TABLE public.post DISABLE TRIGGER post_guard;
ALTER TABLE public.post DISABLE TRIGGER post_updated;
ALTER TABLE public.registration DISABLE TRIGGER registration_guard;
ALTER TABLE public.registration DISABLE TRIGGER registration_updated;
ALTER TABLE public.post NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.registration NO FORCE ROW LEVEL SECURITY;
UPDATE public.post p SET registration_questions=(
  SELECT jsonb_agg(CASE WHEN e.q->>'type'='choice' THEN jsonb_set(e.q,'{options}',
    (SELECT jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'label',x.o) ORDER BY x.n)
      FROM jsonb_array_elements_text(e.q->'options') WITH ORDINALITY x(o,n))) ELSE e.q END ORDER BY e.i)
  FROM jsonb_array_elements(p.registration_questions) WITH ORDINALITY e(q,i))
WHERE p.registration_questions<>'[]'::jsonb;
UPDATE public.registration r SET answers=(
  SELECT jsonb_object_agg(a.key,CASE WHEN q->>'type'='choice' THEN
    (SELECT to_jsonb(o->>'id') FROM jsonb_array_elements(q->'options') o WHERE o->>'label'=a.value#>>'{}')
    ELSE a.value END)
  FROM jsonb_each(r.answers) a JOIN public.post p ON p.id=r.post_id
  JOIN jsonb_array_elements(p.registration_questions) q ON q->>'id'=a.key)
WHERE r.answers<>'{}'::jsonb;
ALTER TABLE public.post FORCE ROW LEVEL SECURITY;
ALTER TABLE public.registration FORCE ROW LEVEL SECURITY;
ALTER TABLE public.post ENABLE TRIGGER post_guard;
ALTER TABLE public.post ENABLE TRIGGER post_updated;
ALTER TABLE public.registration ENABLE TRIGGER registration_guard;
ALTER TABLE public.registration ENABLE TRIGGER registration_updated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.post p WHERE NOT vboard_api.valid_questions(p.registration_questions))
    OR EXISTS (SELECT 1 FROM public.registration r WHERE r.answers IS NULL OR EXISTS
      (SELECT 1 FROM jsonb_each(r.answers) a WHERE jsonb_typeof(a.value) IS DISTINCT FROM 'string')) THEN
    RAISE EXCEPTION 'Choice conversion left an unmatched question or answer';
  END IF;
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
      AND (EXISTS (SELECT 1 FROM jsonb_array_elements(OLD.registration_questions) o WHERE NOT EXISTS
        (SELECT 1 FROM jsonb_array_elements(NEW.registration_questions) n WHERE n->>'id'=o->>'id' AND n->>'type'=o->>'type'))
      OR EXISTS (SELECT 1 FROM public.registration r CROSS JOIN LATERAL jsonb_each_text(r.answers) a
        JOIN jsonb_array_elements(NEW.registration_questions) n ON n->>'id'=a.key AND n->>'type'='choice'
        WHERE r.post_id=NEW.id AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(n->'options') x WHERE x->>'id'=a.value))) THEN
      RAISE EXCEPTION 'Answered questions and picked choices cannot be removed' USING ERRCODE='23514'; END IF;
  END IF;
  SELECT count(*)::int INTO occupied FROM public.registration r WHERE r.post_id=NEW.id AND r.status IN ('approved','attended');
  IF NEW.capacity IS NOT NULL AND NEW.capacity < occupied THEN RAISE EXCEPTION 'Capacity is below occupied seats'; END IF;
  RETURN NEW;
END $$;
