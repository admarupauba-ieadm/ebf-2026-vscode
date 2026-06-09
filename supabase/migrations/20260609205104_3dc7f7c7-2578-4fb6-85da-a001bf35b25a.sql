-- Internal helpers: revoke public and anon execute, keep for authenticated (needed by RLS policies and admin dashboard)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;

-- Keep execute for authenticated — required by RLS policies and admin RPC calls
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

-- Public RPCs intentionally callable - keep grants explicit
GRANT EXECUTE ON FUNCTION public.criar_inscricao(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consultar_inscricao(text) TO anon, authenticated;
