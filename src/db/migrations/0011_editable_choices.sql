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
        (SELECT 1 FROM jsonb_array_elements(NEW.registration_questions) n WHERE n->>'id'=o->>'id' AND n->>'type'=o->>'type')) THEN
      RAISE EXCEPTION 'Answered questions cannot be removed' USING ERRCODE='23514'; END IF;
  END IF;
  SELECT count(*)::int INTO occupied FROM public.registration r WHERE r.post_id=NEW.id AND r.status IN ('approved','attended');
  IF NEW.capacity IS NOT NULL AND NEW.capacity < occupied THEN RAISE EXCEPTION 'Capacity is below occupied seats'; END IF;
  RETURN NEW;
END $$;
