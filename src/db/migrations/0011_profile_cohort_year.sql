ALTER TABLE "profile" ADD COLUMN "cohort_year" integer;
ALTER TABLE "profile" ADD CONSTRAINT "profile_cohort_year_range" CHECK ("profile"."cohort_year" IS NULL OR "profile"."cohort_year" BETWEEN 2000 AND 2100);
CREATE OR REPLACE FUNCTION vboard_api.event_attendees(post_id uuid) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF NOT vboard_api.event_operator(post_id) THEN RAISE EXCEPTION 'Attendee access denied' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT jsonb_build_object('id',r.id,'status',r.status,'registeredAt',r.registered_at,
    'checkedInAt',r.checked_in_at,'userId',u.id,'name',u.name,'email',u.email,
    'rollNumber',p.roll_number,'department',p.department,'cohortYear',p.cohort_year,'bio',p.bio,'answers',r.answers)
  FROM public.registration r JOIN public."user" u ON u.id=r.user_id LEFT JOIN public.profile p ON p.user_id=u.id
  WHERE r.post_id=event_attendees.post_id ORDER BY r.registered_at;
END $$;
