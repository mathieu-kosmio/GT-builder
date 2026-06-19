-- =============================================================================
-- GT-builder - droits du role applicatif + seed des offres
-- =============================================================================

-- Droits CRUD sur les tables, soumis au RLS. Pas de DDL pour l'app.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gtbuilder_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gtbuilder_app;

-- Le journal d'audit est append-only : on retire UPDATE/DELETE
REVOKE UPDATE, DELETE ON validation_log FROM gtbuilder_app;

-- Defaut pour les objets crees ulterieurement par migrations
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO gtbuilder_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO gtbuilder_app;

-- ---------- Seed des offres ----------
-- Palier gratuit : 13 GT, 1 livrable par GT (parametrable a tout moment).
INSERT INTO plan (id, name, max_workgroups, max_deliverables_per_workgroup,
                  max_transcription_minutes_month, price_eur_month) VALUES
  ('free',     'Gratuit',  13,   1,    600,  0),
  ('standard', 'Standard', 50,   5,   3000, 0),    -- prix a definir
  ('pro',      'Pro',      NULL, NULL, NULL, 0)     -- illimite, prix a definir
ON CONFLICT (id) DO NOTHING;
