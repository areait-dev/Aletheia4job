-- Ogni nuova tabella del schema public nasce con la RLS attiva.
-- Motivo: l'API REST di Supabase (PostgREST) espone il schema public; con la RLS attiva e nessuna
-- policy, anon/authenticated non vedono nulla. Prisma (ruolo postgres) ignora la RLS, quindi l'app
-- non cambia comportamento. Evita che una tabella creata da una migrazione futura resti esposta.
--
-- Vale per CREATE TABLE, CREATE TABLE AS e SELECT INTO nel solo schema public.
-- Non modifica tabelle già esistenti (la migrazione 20261111100000 le ha già coperte).

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table', 'partitioned table')
  LOOP
    IF cmd.schema_name = 'public' THEN
      BEGIN
        EXECUTE format('ALTER TABLE IF EXISTS %s ENABLE ROW LEVEL SECURITY', cmd.object_identity);
      EXCEPTION WHEN OTHERS THEN
        -- Non deve mai bloccare una migrazione: l'errore finisce nei log del database.
        RAISE LOG 'rls_auto_enable: RLS non abilitata su %: %', cmd.object_identity, SQLERRM;
      END;
    END IF;
  END LOOP;
END;
$$;

-- La funzione non deve essere richiamabile via API REST (rpc).
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

DROP EVENT TRIGGER IF EXISTS rls_auto_enable;
CREATE EVENT TRIGGER rls_auto_enable
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();
