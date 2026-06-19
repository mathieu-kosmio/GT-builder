# GT-builder — Spécification technique détaillée

> Document d'architecture et d'implémentation. Complète la spec fonctionnelle (`00`), la cartographie des composants (`02`) et la note d'arbitrage (`03`). Inclut le `docker-compose.yml` cible livré à la racine.

**Version** 0.1  •  **Date** 19 juin 2026  •  Auteur Mathieu / Kosmio
**Stack** PostgreSQL/pgvector · Next.js · Tiptap/Yjs/Hocuspocus · BullMQ/Valkey · transcription et LLM souverains managés · Gotenberg · Astro · Caddy

---

## 1. Vue d'ensemble de l'architecture

GT-builder est une application multi-tenant qui orchestre un cycle : **réunion → transcript → compte rendu validé → propositions traçées → livrable → publication**. L'architecture sépare cinq plans :

- **Plan applicatif** (`app`, Next.js) : UI, API, logique métier, authentification, droits.
- **Plan temps réel** (`hocuspocus`) : co-édition CRDT du livrable et présence.
- **Plan asynchrone** (`worker`, BullMQ) : transcription, génération de CR, propositions IA, rendu PDF, publication. Tout ce qui est long ou appelle une IA passe par une file.
- **Plan données** (`postgres` + `pgvector`, stockage objet S3) : source de vérité, isolation tenant par RLS, vecteurs pour le RAG.
- **Plan diffusion** (`public-site` Astro, `gotenberg`, `caddy`) : pages publiques, PDF charté, routage et TLS.

Les services lourds en calcul (transcription, LLM) sont des **APIs souveraines externes** (OVHcloud / Scaleway / Mistral), appelées par le worker derrière une abstraction. Aucun GPU n'est hébergé dans la stack.

```
Navigateur
   |  HTTPS / WSS (Caddy, TLS auto, routage par sous-domaine)
   v
[app Next.js] ---- REST/RPC ----> logique métier, droits, RLS
   |   \__ WSS __> [hocuspocus] (Yjs) <--> Postgres (snapshots Yjs)
   |
   |  enqueue (Valkey/BullMQ)
   v
[worker] --> Transcription souveraine (OVH/Scaleway)  --> Postgres
        --> LLM souverain (Mistral via LiteLLM)        --> Postgres
        --> Gotenberg (HTML->PDF)                      --> S3
        --> LinkedIn API / export web                  --> public-site (Astro)
   |
   v
[postgres + pgvector]   [S3 souverain]
```

---

## 2. Modèle de données détaillé

Schéma relationnel sous PostgreSQL. Toutes les tables « métier » portent une colonne `tenant_id` indexée, pivot de l'isolation RLS (section 6). Identifiants en `uuid` (`gen_random_uuid()`), horodatage `created_at` / `updated_at` systématique.

### 2.1 Tenants et utilisateurs

**tenant** — une organisation cliente.
`id`, `slug` (sous-domaine, unique), `name`, `custom_domain` (nullable), `status` (`active|suspended`), `settings` (jsonb : quotas, options IA), `created_at`.

**user_account** — un compte.
`id`, `email` (unique), `display_name`, `password_hash` (nullable si SSO), `auth_provider` (`local|oidc`), `created_at`.

**membership** — rattachement d'un user à un tenant.
`id`, `tenant_id`, `user_id`, `role_tenant` (`admin|member`), `created_at`. Unique (`tenant_id`, `user_id`).

**charter** — charte graphique du tenant.
`id`, `tenant_id` (unique), `logo_url`, `colors` (jsonb), `fonts` (jsonb), `cover_template`, `footer_text`, `legal_mentions`.

### 2.2 Groupes de travail et réunions

**workgroup** — un groupe de travail.
`id`, `tenant_id`, `name`, `objective`, `status` (`active|archived`), `created_at`.

**workgroup_member** — membre d'un GT et son rôle local.
`id`, `tenant_id`, `workgroup_id`, `user_id`, `role_wg` (`facilitator|contributor|reader`). Unique (`workgroup_id`, `user_id`).

**meeting** — une réunion.
`id`, `tenant_id`, `workgroup_id`, `title`, `scheduled_at`, `agenda` (text), `status` (`planned|recorded|transcribed|minuted`), `video_link` (nullable), `created_at`.

**meeting_attendee** — présents (membres ou invités externes).
`id`, `tenant_id`, `meeting_id`, `user_id` (nullable), `external_name` (nullable), `present` (bool).

**asset** — fichiers déposés (audio, vidéo, slides), stockés en S3.
`id`, `tenant_id`, `meeting_id` (nullable), `kind` (`audio|video|slide|other`), `s3_key`, `mime`, `size_bytes`, `created_at`.

### 2.3 Transcription, comptes rendus, actions

**transcript** — transcription d'une réunion.
`id`, `tenant_id`, `meeting_id` (unique), `language`, `status` (`pending|processing|ready|failed`), `engine` (`whisper|linto`), `created_at`.

**transcript_segment** — segments horodatés diarisés.
`id`, `tenant_id`, `transcript_id`, `start_ms`, `end_ms`, `speaker_label`, `text`. Index (`transcript_id`, `start_ms`).

**minutes** — compte rendu (CR).
`id`, `tenant_id`, `meeting_id`, `status` (`draft_ai|under_review|validated`), `content` (jsonb structuré : présents, décisions, points, actions), `validated_by` (user, nullable), `validated_at` (nullable), `version`, `created_at`.

**action_item** — action extraite d'un CR.
`id`, `tenant_id`, `minutes_id`, `workgroup_id`, `description`, `assignee_user_id` (nullable), `assignee_label` (nullable), `due_date` (nullable), `status` (`open|done|cancelled`).

### 2.4 Livrable vivant (cœur)

**deliverable** — un livrable.
`id`, `tenant_id`, `workgroup_id`, `title`, `template_kind` (`advocacy|guide|whitepaper|repository|tool_spec`), `status` (`drafting|review|published`), `yjs_doc_id`, `created_at`.

**section** — une section du livrable.
`id`, `tenant_id`, `deliverable_id`, `position`, `heading`, `status` (`todo|in_discussion|validated`), `yjs_fragment_id`, `created_at`. Le contenu riche vit dans le document Yjs ; la table porte la structure, l'ordre et l'état éditorial.

**proposal** — proposition de modification générée par l'IA (le différenciant).
`id`, `tenant_id`, `section_id`, `source_minutes_id`, `diff` (jsonb : avant/après ou patch), `rationale` (text, explication IA), `status` (`proposed|accepted|amended|rejected`), `decided_by` (user, nullable), `decided_at` (nullable), `created_at`.

**provenance_link** — lien de traçabilité section ↔ réunion source.
`id`, `tenant_id`, `section_id`, `minutes_id`, `proposal_id` (nullable), `created_at`. Permet d'afficher « ce passage vient de la réunion #N ».

**validation_log** — journal d'audit éditorial.
`id`, `tenant_id`, `entity_type` (`minutes|proposal|deliverable`), `entity_id`, `action` (`validated|accepted|amended|rejected|published`), `actor_user_id`, `at`. Append-only.

**section_embedding** — vecteurs pgvector pour la recherche et le RAG.
`id`, `tenant_id`, `section_id`, `embedding` (`vector(1024)`), `model`, `created_at`.

### 2.5 Publication

**publication** — instance publiée d'un livrable.
`id`, `tenant_id`, `deliverable_id`, `channel` (`web|pdf|linkedin`), `url` (nullable), `pdf_s3_key` (nullable), `published_by`, `published_at`, `status` (`scheduled|published|failed`).

---

## 3. Le moteur de propositions traçées (différenciant)

C'est le seul gros « build » et la promesse produit. Déroulé d'un cycle de mise à jour :

1. **Déclencheur** : un CR passe à `validated`. Le worker reçoit un job `propose-updates(minutes_id)`.
2. **Contexte** : le worker récupère le CR validé et, par RAG (pgvector), les sections du livrable les plus proches sémantiquement, pour cibler où la matière nouvelle s'insère.
3. **Génération** : appel LLM (Mistral) avec un prompt cadré par le `template_kind` (ton et plan du gabarit). Le modèle renvoie, **section par section**, soit un patch, soit une nouvelle sous-section proposée, avec une justification courte.
4. **Matérialisation** : pour chaque suggestion, création d'une ligne `proposal` (statut `proposed`, `diff` avant/après, `rationale`, `source_minutes_id`) et d'un `provenance_link` provisoire.
5. **Revue humaine** : l'animateur voit les propositions en diff dans l'UI. Pour chacune : **accepter** (le patch est appliqué au document Yjs de la section, `provenance_link` confirmé), **amender** (édition avant application), **rejeter** (aucune écriture). Chaque décision écrit une ligne `validation_log`.
6. **Garde-fou** : aucune écriture automatique dans le document Yjs sans une décision `accepted`/`amended`. La publication externe peut exiger une double validation (réglable par tenant).

Invariant central : **tout passage du livrable est rattachable à une réunion source via `provenance_link`, et toute écriture est tracée dans `validation_log`.** C'est ce qui rend la valorisation et la gouvernance multi-acteurs crédibles.

---

## 4. Surface d'API (extrait)

API REST/RPC servie par `app`, authentifiée par session JWT, filtrée par RLS. Conventions REST classiques, ici les points structurants :

- `POST /workgroups` · `GET /workgroups/:id` — gestion des GT.
- `POST /workgroups/:id/meetings` — planifier une réunion.
- `POST /meetings/:id/assets` — déposer audio/vidéo/transcript (upload S3 pré-signé).
- `POST /meetings/:id/transcribe` — enqueue transcription.
- `POST /meetings/:id/minutes:generate` — enqueue génération du CR (brouillon IA).
- `POST /minutes/:id:validate` — valider le CR (déclenche `propose-updates`).
- `GET /deliverables/:id/proposals?status=proposed` — propositions en attente.
- `POST /proposals/:id:accept` · `:amend` · `:reject` — décision humaine, écrit `validation_log`.
- `GET /sections/:id/provenance` — réunions sources d'une section.
- `POST /deliverables/:id:render` — rendu HTML charté puis PDF (Gotenberg).
- `POST /deliverables/:id:publish` — publier (web / pdf / linkedin).

Le temps réel (édition collaborative, présence, curseurs) ne passe pas par cette API : il transite par WebSocket vers `hocuspocus`, qui valide le JWT et persiste les snapshots Yjs en base.

---

## 5. Traitements asynchrones (files BullMQ sur Valkey)

| File | Job | Entrée | Sortie | Appelle |
|---|---|---|---|---|
| `transcription` | `transcribe` | `asset` audio | `transcript` + segments | API transcription souveraine |
| `minutes` | `generate-minutes` | `transcript` | `minutes` (`draft_ai`) | LLM |
| `proposals` | `propose-updates` | `minutes` validé | `proposal[]` + provenance | LLM + pgvector |
| `embeddings` | `embed-section` | `section` modifiée | `section_embedding` | LLM (embeddings) |
| `render` | `render-pdf` | `deliverable` | PDF en S3 | Gotenberg |
| `publish` | `publish-channel` | `publication` | URL / statut | LinkedIn API, public-site |

Files séparées pour cloisonner les quotas et les reprises sur erreur (retry exponentiel, dead-letter par file). Idempotence par clé métier pour éviter les doublons.

---

## 6. Multi-tenant et sécurité

- **Isolation par Row Level Security.** L'app se connecte avec un rôle Postgres applicatif (`APP_DB_USER`) non superuser. À chaque requête, l'app positionne `SET app.tenant_id = '<uuid>'` et `SET app.user_id`. Chaque table métier porte une policy `USING (tenant_id = current_setting('app.tenant_id')::uuid)`. L'isolation est garantie au niveau base, sans dépendre du code applicatif.
- **Rôles applicatifs** : `admin` (tenant), `facilitator`, `contributor`, `reader` par GT. Les autorisations fines (qui valide, qui publie) sont vérifiées dans l'app au-dessus du RLS.
- **Stockage objet** : clés S3 préfixées par `tenant_id`, URLs pré-signées à durée courte.
- **Auth** : sessions JWT signées (`AUTH_SECRET`), option Keycloak (OIDC/SAML) pour les fédérations avec annuaire (profil `sso`).
- **RGPD** : consentement à l'enregistrement (champ sur `meeting`), durées de conservation paramétrables par tenant (purge des `asset`/`transcript`), export et suppression par tenant.
- **IA et conformité** : provenance et `validation_log` natifs ; mention « rédigé avec assistance IA, validé par le GT » optionnelle sur les publications ; humain toujours décideur (cohérent avec l'AI Act).
- **Secrets** : hors image, injectés par `.env` / secrets du PaaS. Réseaux Docker séparés `backend` (privé) et `frontend` (exposé via Caddy uniquement).

---

## 7. Déploiement

Le `docker-compose.yml` cible (racine du projet) décrit la topologie complète. Services : `postgres`, `valkey`, `app`, `hocuspocus`, `worker`, `gotenberg`, `public-site`, `caddy`, plus deux profils optionnels (`sso` → Keycloak, `local-ai` → Whisper local pour le dev).

Mise en route :

```bash
cp .env.example .env        # renseigner secrets, S3, endpoints LLM/transcription
docker compose up -d        # stack complète
# Dev avec transcription locale :
docker compose --profile local-ai up -d
# Avec SSO Keycloak :
docker compose --profile sso up -d
```

Cibles d'hébergement souveraines recommandées : **Clever Cloud** ou **Scaleway** (PaaS / VM françaises), **OVHcloud SecNumCloud** pour les tenants sensibles ou publics. Caddy gère le TLS automatique et le routage par sous-domaine ; le wildcard `*.gtbuilder.fr` sert les pages publiques des tenants.

Sauvegardes : dump Postgres quotidien + versionnement S3. Observabilité (option) : Grafana + Loki + Prometheus, métriques de files BullMQ et de coût d'inférence par tenant.

---

## 8. Chiffrage indicatif du MVP

Estimation en jours-homme de développement, hors design et conduite de projet. Profil full-stack TypeScript senior. Fourchettes prudentes.

| Lot | Contenu | Estimation (j) |
|---|---|---|
| Socle & infra | docker-compose, Caddy, Postgres + RLS, auth, structure Next.js, CI | 12 à 18 |
| Tenants & GT | tenants, memberships, GT, rôles, charte | 8 à 12 |
| Réunions & assets | planification, upload S3, dépôt transcript | 6 à 9 |
| Transcription | intégration API souveraine + worker + segments diarisés | 7 à 11 |
| CR assisté | génération LLM, écran de validation, extraction d'actions | 9 à 14 |
| Livrable vivant | Tiptap + Yjs + Hocuspocus, sections, états | 14 à 20 |
| **Moteur de propositions traçées** | proposals, diff, provenance, validation_log, RAG pgvector | 15 à 22 |
| Mise en forme & PDF | charte tenant, rendu HTML, Gotenberg | 7 à 11 |
| Publication | export web (Astro), PDF, LinkedIn mode dégradé | 6 à 10 |
| Durcissement | RGPD, quotas, journaux, tests, recette pilote | 8 à 12 |
| **Total MVP** | | **~92 à 139 j** (≈ 4,5 à 7 mois à 1 ETP, ou ~3 mois à 2 ETP) |

Le lot le plus risqué et le plus créateur de valeur est le **moteur de propositions traçées** : c'est là qu'il faut concentrer l'effort de conception et la recette avec le GT pilote.

---

## 9. Risques techniques et parades

| Risque | Parade |
|---|---|
| Qualité variable de la transcription FR | Édition manuelle systématique avant exploitation ; bascule WhisperX → LinTO |
| Propositions IA hors-sujet ou hallucinées | RAG ciblé, gabarit contraint, `rationale` exigée, validation humaine obligatoire |
| Conflits de co-édition | CRDT Yjs (sans verrou), snapshots et historique par section |
| Coût d'inférence au volume | Quotas par tenant, batch hors ligne, abstraction LLM pour négocier/changer de fournisseur |
| Accès LinkedIn API incertain | Mode dégradé « post prêt à coller » au MVP |
| Dérive de complexité du compose | Profils Docker, services optionnels désactivés par défaut |

---

## 10. Décisions verrouillées (19 juin 2026)

1. **Front : Next.js.** Application et API dans un même socle TypeScript.
2. **Inférence : Mistral par défaut**, avec **bascule OpenAI ou Anthropic (Claude) par simple paramétrage** (table `llm_config`, par tenant et par usage). Les **clés d'API sont fournies par le tenant** et stockées chiffrées (`api_key_enc`, `pgp_sym_encrypt`). L'abstraction reste compatible OpenAI pour les trois fournisseurs.
3. **Modèle économique : offres par tenant** à plafonds (nombre de GT et nombre de livrables par GT), appliqués au niveau base par triggers (`enforce_workgroup_quota`, `enforce_deliverable_quota`). **Palier gratuit : 13 GT, 1 livrable par GT** (paramètre, ajustable). Paliers Standard et Pro ouverts, prix à définir.

### Modèle d'offres (seed initial)

| Plan | GT max | Livrables / GT | Minutes transcription / mois | Prix |
|---|---|---|---|---|
| Gratuit | 13 | 1 | 600 | 0 € |
| Standard | 50 | 5 | 3000 | à définir |
| Pro | illimité | illimité | illimité | à définir |

Les plafonds sont portés par la table `plan`, le tenant référence un `plan_id`. Une limite `NULL` signifie illimité. Le franchissement de quota lève une erreur base remontée proprement par l'app (invitation à upgrader).

### Configuration LLM (table `llm_config`)

Une ligne par tenant et par `purpose` (`default`, `minutes`, `proposals`, `embeddings`). Champs : `provider` (`mistral|openai|anthropic`), `base_url` (endpoint OpenAI-compatible : Mistral, OVH, Scaleway), `model`, `api_key_enc`. Le worker résout la config au moment du job, ce qui permet à un tenant d'utiliser Mistral pour les CR et un autre modèle pour les embeddings, sans redéploiement.

## 11. Prochaines étapes

1. Initialiser le dépôt Next.js avec le `docker-compose.yml` et les scripts `db/init` fournis.
2. Prototyper le **moteur de propositions traçées** sur des **CR réels d'un GT pilote** (import des données de GT existantes comme jeu d'amorçage).
3. Choisir le **fournisseur d'inférence Mistral** (OVHcloud SecNumCloud vs Scaleway) selon l'exigence de souveraineté du premier client.
4. Implémenter l'**écran d'offres / quotas** (compteurs, messages d'upgrade) au-dessus des triggers.
