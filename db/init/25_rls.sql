-- =============================================================================
-- GT-builder - Row Level Security : isolation multi-tenant au niveau base
-- L'app positionne a chaque requete :
--    SET app.tenant_id = '<uuid>';   (et SET app.user_id = '<uuid>';)
-- Le role applicatif n'est ni proprietaire des tables ni BYPASSRLS,
-- donc les policies s'appliquent toujours a lui.
-- =============================================================================

-- Helper : tenant courant (NULL-safe si le GUC n'est pas positionne)
CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;

-- Active le RLS et pose la policy d'isolation sur toutes les tables a tenant_id
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'membership','charter','llm_config','workgroup','workgroup_member',
    'meeting','meeting_attendee','asset','transcript','transcript_segment',
    'minutes','action_item','deliverable','section','proposal',
    'provenance_link','validation_log','section_embedding','publication'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
        USING (tenant_id = app_current_tenant())
        WITH CHECK (tenant_id = app_current_tenant());
    $f$, t);
  END LOOP;
END $$;

-- La table tenant elle-meme : un tenant ne voit que sa propre ligne
ALTER TABLE tenant ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_self ON tenant
  USING (id = app_current_tenant())
  WITH CHECK (id = app_current_tenant());

-- Tables de reference globales (plan) et identites (user_account) :
-- pas d'isolation tenant. Acces restreint par les GRANT (voir 30_grants_seed.sql)
-- et la logique applicative.
