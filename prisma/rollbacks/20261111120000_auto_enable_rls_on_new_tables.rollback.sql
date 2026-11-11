-- ROLLBACK della migrazione 20261111120000_auto_enable_rls_on_new_tables (NON eseguito).
-- Rimuove l'event trigger e la funzione. Le tabelle create nel frattempo mantengono la RLS attiva.
-- Poi: npx prisma migrate resolve --rolled-back 20261111120000_auto_enable_rls_on_new_tables
DROP EVENT TRIGGER IF EXISTS rls_auto_enable;
DROP FUNCTION IF EXISTS public.rls_auto_enable();
