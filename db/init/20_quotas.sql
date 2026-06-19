-- =============================================================================
-- GT-builder - application des quotas d'offre (plafonds GT et livrables/GT)
-- Enforce au niveau base, donc impossible a contourner cote applicatif.
-- Limite NULL dans la table plan = illimite.
-- =============================================================================

-- Plafond du nombre de groupes de travail par tenant
CREATE OR REPLACE FUNCTION enforce_workgroup_quota() RETURNS trigger AS $$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  SELECT p.max_workgroups INTO v_limit
    FROM tenant t JOIN plan p ON p.id = t.plan_id
   WHERE t.id = NEW.tenant_id;

  IF v_limit IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM workgroup WHERE tenant_id = NEW.tenant_id;
    IF v_count >= v_limit THEN
      RAISE EXCEPTION 'Quota atteint : % groupes de travail maximum pour ce plan', v_limit
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workgroup_quota
  BEFORE INSERT ON workgroup
  FOR EACH ROW EXECUTE FUNCTION enforce_workgroup_quota();

-- Plafond du nombre de livrables par groupe de travail
CREATE OR REPLACE FUNCTION enforce_deliverable_quota() RETURNS trigger AS $$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  SELECT p.max_deliverables_per_workgroup INTO v_limit
    FROM tenant t JOIN plan p ON p.id = t.plan_id
   WHERE t.id = NEW.tenant_id;

  IF v_limit IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM deliverable WHERE workgroup_id = NEW.workgroup_id;
    IF v_count >= v_limit THEN
      RAISE EXCEPTION 'Quota atteint : % livrable(s) maximum par groupe de travail pour ce plan', v_limit
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_deliverable_quota
  BEFORE INSERT ON deliverable
  FOR EACH ROW EXECUTE FUNCTION enforce_deliverable_quota();
