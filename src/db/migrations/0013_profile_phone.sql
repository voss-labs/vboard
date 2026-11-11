ALTER TABLE "profile" ADD COLUMN "phone" text;
ALTER TABLE "profile" ADD CONSTRAINT "profile_phone_format" CHECK ("profile"."phone" IS NULL OR "profile"."phone" ~ '^[6-9][0-9]{9}$');
CREATE OR REPLACE FUNCTION vboard_api.event_attendees(post_id uuid) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF NOT vboard_api.event_operator(post_id) THEN RAISE EXCEPTION 'Attendee access denied' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT jsonb_build_object('id',r.id,'status',r.status,'registeredAt',r.registered_at,
    'checkedInAt',r.checked_in_at,'userId',u.id,'name',u.name,'email',u.email,
    'rollNumber',p.roll_number,'department',p.department,'cohortYear',p.cohort_year,'phone',p.phone,'bio',p.bio,'answers',r.answers)
  FROM public.registration r JOIN public."user" u ON u.id=r.user_id LEFT JOIN public.profile p ON p.user_id=u.id
  WHERE r.post_id=event_attendees.post_id ORDER BY r.registered_at;
END $$;
