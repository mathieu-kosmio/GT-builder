-- =============================================================================
-- GT-builder - schema relationnel (PostgreSQL 16 + pgvector)
-- Conventions : uuid PK, tenant_id sur toute table metier, created_at/updated_at.
-- =============================================================================

-- ---------- Reference globale : offres / plans ----------
CREATE TABLE plan (
  id                            text PRIMARY KEY,            -- 'free', 'standard', 'pro'
  name                          text NOT NULL,
  max_workgroups                integer,                     -- NULL = illimite
  max_deliverables_per_workgroup integer,                    -- NULL = illimite
  max_transcription_minutes_month integer,                   -- garde-fou de cout
  price_eur_month               numeric(8,2) NOT NULL DEFAULT 0,
  created_at                    timestamptz NOT NULL DEFAULT now()
);

-- ---------- Identites globales ----------
CREATE TABLE user_account (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  display_name  text NOT NULL,
  password_hash text,                                        -- NULL si SSO
  auth_provider text NOT NULL DEFAULT 'local',               -- local | oidc
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------- Tenant ----------
CREATE TABLE tenant (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,                        -- sous-domaine
  name          text NOT NULL,
  custom_domain text UNIQUE,
  plan_id       text NOT NULL DEFAULT 'free' REFERENCES plan(id),
  status        text NOT NULL DEFAULT 'active',              -- active | suspended
  settings      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE membership (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
  role_tenant text NOT NULL DEFAULT 'member',                -- admin | member
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE TABLE charter (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL UNIQUE REFERENCES tenant(id) ON DELETE CASCADE,
  logo_url      text,
  colors        jsonb NOT NULL DEFAULT '{}'::jsonb,
  fonts         jsonb NOT NULL DEFAULT '{}'::jsonb,
  cover_template text,
  footer_text   text,
  legal_mentions text
);

-- ---------- Configuration LLM par tenant ----------
-- Mistral par defaut ; bascule OpenAI / Claude par simple parametrage.
-- Cles fournies par le tenant, chiffrees (pgp_sym_encrypt) avec une cle serveur.
CREATE TABLE llm_config (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  purpose       text NOT NULL DEFAULT 'default',             -- default | minutes | proposals | embeddings
  provider      text NOT NULL DEFAULT 'mistral',             -- mistral | openai | anthropic
  base_url      text,                                        -- endpoint OpenAI-compatible (OVH/Scaleway/Mistral)
  model         text NOT NULL DEFAULT 'mistral-large-latest',
  api_key_enc   bytea,                                       -- cle chiffree
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, purpose)
);

-- ---------- Groupes de travail ----------
CREATE TABLE workgroup (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  name       text NOT NULL,
  objective  text,
  status     text NOT NULL DEFAULT 'active',                 -- active | archived
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_workgroup_tenant ON workgroup(tenant_id);

CREATE TABLE workgroup_member (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  workgroup_id uuid NOT NULL REFERENCES workgroup(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
  role_wg      text NOT NULL DEFAULT 'contributor',          -- facilitator | contributor | reader
  UNIQUE (workgroup_id, user_id)
);

-- ---------- Reunions ----------
CREATE TABLE meeting (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  workgroup_id uuid NOT NULL REFERENCES workgroup(id) ON DELETE CASCADE,
  title        text NOT NULL,
  scheduled_at timestamptz,
  agenda       text,
  status       text NOT NULL DEFAULT 'planned',              -- planned | recorded | transcribed | minuted
  video_link   text,
  consent_recording boolean NOT NULL DEFAULT false,          -- RGPD
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_meeting_wg ON meeting(workgroup_id);

CREATE TABLE meeting_attendee (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  meeting_id    uuid NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES user_account(id),
  external_name text,
  present       boolean NOT NULL DEFAULT true
);

CREATE TABLE asset (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  meeting_id uuid REFERENCES meeting(id) ON DELETE CASCADE,
  kind       text NOT NULL,                                  -- audio | video | slide | other
  s3_key     text NOT NULL,
  mime       text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- Transcription ----------
CREATE TABLE transcript (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL UNIQUE REFERENCES meeting(id) ON DELETE CASCADE,
  language   text NOT NULL DEFAULT 'fr',
  status     text NOT NULL DEFAULT 'pending',                -- pending | processing | ready | failed
  engine     text NOT NULL DEFAULT 'whisper',               -- whisper | linto
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE transcript_segment (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  transcript_id uuid NOT NULL REFERENCES transcript(id) ON DELETE CASCADE,
  start_ms      integer NOT NULL,
  end_ms        integer NOT NULL,
  speaker_label text,
  text          text NOT NULL
);
CREATE INDEX idx_segment_transcript ON transcript_segment(transcript_id, start_ms);

-- ---------- Comptes rendus + actions ----------
CREATE TABLE minutes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  meeting_id   uuid NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'draft_ai',             -- draft_ai | under_review | validated
  content      jsonb NOT NULL DEFAULT '{}'::jsonb,           -- presents, decisions, points, actions
  validated_by uuid REFERENCES user_account(id),
  validated_at timestamptz,
  version      integer NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE action_item (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  minutes_id      uuid NOT NULL REFERENCES minutes(id) ON DELETE CASCADE,
  workgroup_id    uuid NOT NULL REFERENCES workgroup(id) ON DELETE CASCADE,
  description     text NOT NULL,
  assignee_user_id uuid REFERENCES user_account(id),
  assignee_label  text,
  due_date        date,
  status          text NOT NULL DEFAULT 'open'               -- open | done | cancelled
);

-- ---------- Livrable vivant ----------
CREATE TABLE deliverable (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  workgroup_id  uuid NOT NULL REFERENCES workgroup(id) ON DELETE CASCADE,
  title         text NOT NULL,
  template_kind text NOT NULL,                               -- advocacy | guide | whitepaper | repository | tool_spec
  status        text NOT NULL DEFAULT 'drafting',            -- drafting | review | published
  yjs_doc_id    text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_deliverable_wg ON deliverable(workgroup_id);

CREATE TABLE section (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  deliverable_id uuid NOT NULL REFERENCES deliverable(id) ON DELETE CASCADE,
  position       integer NOT NULL,
  heading        text NOT NULL,
  status         text NOT NULL DEFAULT 'todo',               -- todo | in_discussion | validated
  yjs_fragment_id text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_section_deliverable ON section(deliverable_id, position);

-- Proposition IA (le differenciant) : suggestion diffable, validee par un humain
CREATE TABLE proposal (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  section_id       uuid NOT NULL REFERENCES section(id) ON DELETE CASCADE,
  source_minutes_id uuid NOT NULL REFERENCES minutes(id) ON DELETE CASCADE,
  diff             jsonb NOT NULL,                           -- avant/apres ou patch
  rationale        text,                                     -- explication du modele
  status           text NOT NULL DEFAULT 'proposed',         -- proposed | accepted | amended | rejected
  decided_by       uuid REFERENCES user_account(id),
  decided_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_proposal_section ON proposal(section_id, status);

-- Tracabilite section <-> reunion source
CREATE TABLE provenance_link (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  section_id  uuid NOT NULL REFERENCES section(id) ON DELETE CASCADE,
  minutes_id  uuid NOT NULL REFERENCES minutes(id) ON DELETE CASCADE,
  proposal_id uuid REFERENCES proposal(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_provenance_section ON provenance_link(section_id);

-- Journal d'audit editorial (append-only)
CREATE TABLE validation_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  entity_type   text NOT NULL,                               -- minutes | proposal | deliverable
  entity_id     uuid NOT NULL,
  action        text NOT NULL,                               -- validated | accepted | amended | rejected | published
  actor_user_id uuid REFERENCES user_account(id),
  at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_validation_entity ON validation_log(entity_type, entity_id);

-- Vecteurs pour recherche / RAG
CREATE TABLE section_embedding (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES section(id) ON DELETE CASCADE,
  embedding  vector(1024),                                   -- dim. embeddings Mistral
  model      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_section_embedding_ann ON section_embedding
  USING hnsw (embedding vector_cosine_ops);

-- ---------- Publication ----------
CREATE TABLE publication (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  deliverable_id uuid NOT NULL REFERENCES deliverable(id) ON DELETE CASCADE,
  channel        text NOT NULL,                              -- web | pdf | linkedin
  url            text,
  pdf_s3_key     text,
  published_by   uuid REFERENCES user_account(id),
  published_at   timestamptz,
  status         text NOT NULL DEFAULT 'scheduled'           -- scheduled | published | failed
);
