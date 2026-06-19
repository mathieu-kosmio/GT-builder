# GT-builder

> Plateforme légère et souveraine de production collaborative de livrables pour les
> **groupes de travail** des fédérations, pôles de compétitivité et associations professionnelles.
> *De la réunion au livrable publié, sans rupture de charge.*

GT-builder transforme le flux des réunions d'un groupe de travail en un livrable commun
qui se construit progressivement, puis le met en forme et le publie — sous une règle
non négociable : **l'assistant IA suggère, l'humain valide**.

- **Capter** — organiser les réunions, transcrire, produire un compte rendu validé.
- **Construire** — alimenter le livrable section par section à partir des CR validés,
  via des **propositions diffables traçées** jusqu'à leur réunion source.
- **Publier** — mettre en forme selon la charte du tenant, exporter (PDF / web) et diffuser.

> *Codename historique du cadrage : « RikiWiki ».*

## Architecture

Application multi-tenant orchestrant le cycle
**réunion → transcript → compte rendu validé → propositions traçées → livrable → publication**.

```
Navigateur
   │  HTTPS / WSS (Caddy : TLS auto, routage par sous-domaine)
   ▼
[app · Next.js]  ── REST/RPC ──>  logique métier, droits, RLS Postgres
   │   └─ WSS ─> [hocuspocus] (Yjs CRDT) <─> Postgres (snapshots)
   │  enqueue (Valkey / BullMQ)
   ▼
[worker · BullMQ] ─> Transcription souveraine (OVH/Scaleway)  ─> Postgres
                  ─> LLM souverain (Mistral, OpenAI-compatible) ─> Postgres
                  ─> Gotenberg (HTML→PDF) ─> S3
                  ─> Publication web / LinkedIn ─> public-site (Astro)
   ▼
[postgres + pgvector]   [S3 souverain]
```

Isolation multi-tenant garantie **au niveau base** par Row Level Security : le rôle applicatif
`gtbuilder_app` n'est ni superuser ni `BYPASSRLS`, et chaque requête métier positionne
`app.tenant_id` dans sa transaction (voir `app/src/lib/db.ts`).

### Stack

| Couche | Choix | Licence |
|---|---|---|
| Application + API | Next.js 15 | MIT |
| Données | PostgreSQL 16 + pgvector | permissive |
| Co-édition temps réel | Tiptap / Yjs / Hocuspocus | MIT |
| Files de jobs | Valkey + BullMQ | BSD + MIT |
| Transcription / LLM | APIs souveraines OpenAI-compatibles (Mistral via OVH/Scaleway) | API FR |
| PDF charté | Gotenberg | MIT |
| Pages publiques | Astro 5 (SSR) | MIT |
| Reverse proxy / TLS | Caddy | Apache 2.0 |

Détails et arbitrages dans [`docs/`](docs/).

## Statut

**Squelette amorçable.** Le câblage d'infrastructure est réel (DB + RLS, auth JWT,
files BullMQ, abstraction LLM, co-édition). Les traitements IA (transcription, génération
de CR, moteur de propositions) sont des **stubs** qui écrivent déjà l'état en base — chacun
destiné à devenir un module complet (voir [`docs/04-Specification-Technique.md`](docs/04-Specification-Technique.md)).

## Prérequis

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [Node.js 22](https://nodejs.org/) et [pnpm](https://pnpm.io/) (développement local des sous-projets)

## Démarrage

```bash
cp .env.example .env          # renseigner secrets, S3, endpoints LLM/transcription
docker compose up -d          # stack complète
```

- Application : `https://app.<PUBLIC_BASE_DOMAIN>` — santé : `GET /api/health`
- Pages publiques d'un tenant : `https://<slug>.<PUBLIC_BASE_DOMAIN>`
- Co-édition : `wss://collab.<PUBLIC_BASE_DOMAIN>`

### Profils optionnels

```bash
docker compose --profile local-ai up -d   # transcription Whisper locale (dev)
docker compose --profile sso up -d         # Keycloak (OIDC/SAML)
```

## Développement local d'un sous-projet

Chaque service est un projet pnpm autonome :

```bash
cd app && pnpm install && pnpm dev          # Next.js + API  (:3000)
cd hocuspocus && pnpm install && pnpm dev    # co-édition     (:1234)
cd public-site && pnpm install && pnpm dev   # site public    (:4321)
```

## Arborescence

```
app/           Next.js (UI + API) et worker BullMQ (même image)
hocuspocus/    serveur de co-édition temps réel (Yjs)
public-site/   site public des livrables (Astro SSR)
db/init/       bootstrap Postgres : schéma, RLS, quotas, seed des offres
caddy/         reverse proxy + TLS + routage par sous-domaine
docs/          spécifications fonctionnelles et techniques, maquettes
docker-compose.yml
```

## Licence

[GNU AGPL-3.0](LICENSE) — commun numérique souverain.
