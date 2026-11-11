-- ROLLBACK della migrazione 20261111100000_security_rls_revoke_anon (NON eseguito).
-- Ripristina lo stato precedente: RLS disattivata e privilegi di default di Supabase
-- per anon/authenticated. ATTENZIONE: riapre l'accesso pubblico via API REST ai dati.
-- Da eseguire dal SQL editor di Supabase (o con psql sulla DIRECT_URL).
-- Se la migrazione era stata applicata con `prisma migrate deploy`, dopo il rollback
-- segnarla come annullata:  npx prisma migrate resolve --rolled-back 20261111100000_security_rls_revoke_anon

DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated;

DO $$
BEGIN
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
  ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Default privileges di supabase_admin non modificabili da questo ruolo.';
END $$;
