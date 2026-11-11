CREATE FUNCTION vboard_api.update_recipients() RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  IF NOT vboard_api.is_super_admin() THEN RAISE EXCEPTION 'Update recipients denied' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT jsonb_build_object('id',u.id,'name',u.name,'email',u.email,
    'rollNumber',p.roll_number,'department',p.department,'cohortYear',p.cohort_year,'phone',p.phone)
  FROM public."user" u LEFT JOIN public.profile p ON p.user_id=u.id ORDER BY u.created_at,u.id;
END $$;
ALTER FUNCTION vboard_api.update_recipients() OWNER TO vboard_guard;
REVOKE ALL ON FUNCTION vboard_api.update_recipients() FROM PUBLIC,vboard_app,vboard_auth;
GRANT EXECUTE ON FUNCTION vboard_api.update_recipients() TO vboard_app;
