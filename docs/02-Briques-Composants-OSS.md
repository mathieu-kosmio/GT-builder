# GT-builder — Cartographie des composants open-source

> Descente au niveau des libs et composants concrets. Objectif : maximiser le « assembler plutôt que réécrire », avec des licences réellement compatibles revente SaaS et un ancrage souverain.

**Version** 0.1  •  **Date** 19 juin 2026  •  Complément de la spec fonctionnelle (`00-Specification-Fonctionnelle-GT-builder.md`)

---

## 1. Principe de lecture

Pour chaque besoin, on distingue trois postures :

- **Réutiliser** : la brique fait 90 % du job, on l'intègre telle quelle.
- **Assembler** : on combine quelques libs autour de notre logique métier.
- **Construire** : c'est notre différenciation, on l'écrit (mais sur des libs solides).

Le différenciant de GT-builder — la **traçabilité réunion → proposition → section de livrable, sous validation humaine** — est à **construire**. Presque tout le reste se **réutilise**.

---

## 2. Vigilance licences (à lire avant de choisir)

Trois familles de licences, conséquences très différentes pour un SaaS multi-tenant qu'on **revend** :

| Type | Exemples | Conséquence pour nous |
|---|---|---|
| **Permissive** (MIT, BSD, Apache 2.0) | Tiptap, Hocuspocus, Yjs, Strapi, Payload, Astro, Keycloak, Gotenberg, WeasyPrint, Supabase, faster-whisper | Aucune contrainte de revente. **À privilégier.** |
| **Copyleft réseau** (AGPL-3.0) | Docmost, LinTO, MinIO, Garage | Utilisable, mais oblige à publier les modifications du composant exposé en réseau. Acceptable pour un commun numérique, à cloisonner si l'on veut garder du code propriétaire. |
| **Source-available** (BSL, MSCL/FCL, SSPL) | Outline (BSL), **Directus (MSCL)**, Redis (RSALv2/SSPL) | **Revente SaaS restreinte / payante au-delà d'un seuil.** À éviter pour les briques structurantes. Forks libres existants : **Valkey** (fork Redis, BSD). |

Règle simple : socle structurant en **permissif**, tolérance AGPL pour les briques IA/transcription cloisonnées, et on **écarte le source-available** sur le chemin critique.

---

## 3. Cartographie par module

### Socle données, auth, temps réel
| Besoin | Composant | Licence | Posture | Note |
|---|---|---|---|---|
| Base de données | **PostgreSQL** | PostgreSQL (permissive) | Réutiliser | Multi-tenant par Row Level Security (RLS) |
| Backend-as-a-service | **Supabase** (Postgres + Auth/GoTrue + Storage + Realtime + Edge Functions) | Apache 2.0 | Réutiliser | Self-host Docker. RLS = isolation tenant dès le jour 1, sans middleware |
| Auth / SSO entreprise | **Keycloak** (ou Supabase Auth) | Apache 2.0 | Réutiliser | OIDC/SAML pour les fédérations ayant déjà un annuaire |
| Files / objets | **Garage** (Deuxfleurs, FR) ou MinIO | AGPL-3.0 | Réutiliser | Garage = S3 souverain léger, pensé multi-site. MinIO si besoin de maturité |
| Cache / files de jobs | **Valkey** + **BullMQ** | BSD + MIT | Réutiliser | Valkey = fork libre de Redis (évite SSPL). BullMQ pour les jobs transcription/IA |

> Supabase couvre à lui seul base + auth + stockage + temps réel + fonctions serverless. C'est le plus gros accélérateur du MVP, et il reste 100 % portable (Postgres standard, exportable, self-hostable).

### Éditeur de livrable vivant (cœur)
| Besoin | Composant | Licence | Posture | Note |
|---|---|---|---|---|
| Éditeur riche structuré | **Tiptap** (sur ProseMirror) | MIT (cœur) | Assembler | Extensions Pro payantes optionnelles, le cœur suffit |
| Co-édition temps réel | **Yjs** (CRDT) + **Hocuspocus v4** | MIT | Assembler | Backend WebSocket self-host, conflits gérés nativement |
| Diff / propositions | **logique maison** sur Tiptap + Yjs | — | **Construire** | Présentation avant/après par section, accepter/amender/rejeter |
| Provenance section ↔ réunion | **logique maison** + Postgres | — | **Construire** | Le vrai différenciant. Table de liens + journal de validation |
| Versioning / historique | Yjs snapshots + Postgres | MIT | Assembler | Historique par section, restauration |

### Réunions et transcription
| Besoin | Composant | Licence | Posture | Note |
|---|---|---|---|---|
| Transcription FR souveraine | **LinTO** (Linagora) | AGPL-3.0 | Réutiliser | Pile française, modèles entraînés FR |
| Transcription rapide à intégrer | **faster-whisper** / **whisper.cpp** | MIT | Réutiliser | Auto-hébergé GPU FR, excellent rapport effort/qualité |
| Alignement + diarisation | **WhisperX** + **pyannote.audio** | BSD / MIT | Assembler | Qui parle, horodatage mot à mot |
| Visio (si captation interne) | **Jitsi** + **Jibri** (enregistrement) | Apache 2.0 | Réutiliser | Sinon on s'interface avec la visio existante (lien collé) |

### IA générative (CR et propositions)
| Besoin | Composant | Licence / accès | Posture | Note |
|---|---|---|---|---|
| LLM souverain | **Mistral** via **OVHcloud AI Endpoints** ou **Scaleway Managed Inference** | API managée FR | Réutiliser | OVH qualifié SecNumCloud |
| Passerelle LLM publique | **Albert API** (OpenGateLLM, DINUM) | API État | Option | Pour tenants publics, compatible standard OpenAI |
| Abstraction multi-fournisseur | **LiteLLM** ou couche maison (API OpenAI-compatible) | MIT | Assembler | Bascule Mistral/OVH/Scaleway/Albert sans réécrire les modules |
| Auto-hébergement LLM (si besoin) | **vLLM** | Apache 2.0 | Option | Servir un modèle ouvert sur GPU dédié |
| RAG / recherche sémantique | **pgvector** (extension Postgres) | PostgreSQL | Assembler | Reste dans Postgres, zéro brique supplémentaire |

### Mise en forme et publication
| Besoin | Composant | Licence | Posture | Note |
|---|---|---|---|---|
| PDF charté depuis HTML | **Gotenberg** (Chromium/LibreOffice) ou **WeasyPrint** | MIT / BSD | Réutiliser | Gotenberg = API HTTP en conteneur, robuste. WeasyPrint = léger, sans Chromium |
| Site public / pages livrables | **Astro** | MIT | Réutiliser | Génération de pages publiques rapides, SEO, multi-domaine |
| CMS de publication (option) | **Strapi 5** ou **Payload** | MIT | Réutiliser | Si une fédération veut piloter ses contenus. **Éviter Directus (MSCL)** sur le chemin critique |
| LinkedIn | **Community Management API** (`w_organization_social`) | API restreinte | Assembler | Validation LinkedIn requise. Mode dégradé « post prêt à coller » au MVP |

### Application et exploitation
| Besoin | Composant | Licence | Posture | Note |
|---|---|---|---|---|
| Front applicatif | **Next.js** / **Remix** / **SvelteKit** | MIT | Construire | Le produit lui-même |
| Conteneurisation | **Docker** / docker-compose | Apache 2.0 | Réutiliser | Déploiement reproductible « simple à déployer » |
| Observabilité | **Grafana** + **Loki** + **Prometheus** | AGPL / Apache | Réutiliser | Quotas, suivi par tenant |

---

## 4. Deux scénarios de stack

### Scénario A — « Time-to-MVP » (le plus rapide)
Objectif : prouver la boucle de valeur en quelques semaines, tout en restant portable et souverain-compatible.

- **Supabase self-host** (Postgres + Auth + Storage + Realtime) comme socle unique.
- **Tiptap + Yjs + Hocuspocus** pour le livrable vivant ; diff et provenance en logique maison.
- **faster-whisper + WhisperX** pour la transcription (GPU OVH/Scaleway).
- **Mistral via Scaleway/OVH** derrière **LiteLLM**.
- **pgvector** pour la recherche, **Gotenberg** pour le PDF, **Astro** pour les pages publiques.
- **Valkey + BullMQ** pour les jobs, **Docker compose** pour tout déployer.

Tout est permissif sauf la transcription (option AGPL LinTO en V1). Aucune brique source-available sur le chemin critique.

### Scénario B — « Souveraineté maîtrisée » (cible)
On garde le Scénario A et on durcit :

- Transcription **LinTO** (souverain FR) en première intention.
- Hébergement **OVHcloud SecNumCloud** pour les tenants sensibles / publics.
- Stockage objet **Garage** (Deuxfleurs, FR) plutôt que MinIO.
- **Albert API** activable pour les tenants publics.
- **Keycloak** pour le SSO des fédérations disposant d'un annuaire.

---

## 5. Ce qu'on construit vraiment (et seulement ça)

Pour ne pas se disperser, le code propre à GT-builder se limite à :

1. **Le moteur de propositions traçées** : transformer un CR validé en propositions diffables par section, reliées à leur réunion source, avec workflow accepter/amender/rejeter et journal de validation. C'est la promesse produit.
2. **L'orchestration du cycle** : réunion → transcript → CR → propositions → livrable → publication, avec les états et les droits par GT.
3. **Le multi-tenant et la charte** : isolation par RLS, paramétrage de charte graphique, rendu chartré.

Le reste (édition temps réel, transcription, LLM, auth, stockage, PDF, pages publiques) est **assemblé** depuis des briques matures.

---

## 6. Récapitulatif licences (watch-list)

- **À privilégier (permissif)** : Supabase (Apache 2.0), Tiptap/Hocuspocus/Yjs (MIT), Strapi/Payload (MIT), Astro (MIT), Keycloak (Apache 2.0), Gotenberg (MIT), WeasyPrint (BSD), faster-whisper/whisper.cpp (MIT), Valkey (BSD), pgvector (PostgreSQL), vLLM/LiteLLM (Apache/MIT).
- **AGPL — possible mais à cloisonner** : Docmost, LinTO, MinIO, Garage, Grafana/Loki.
- **À éviter sur le chemin critique (source-available)** : Outline (BSL), **Directus (MSCL, gratuit < 5 M€ CA seulement)**, Redis (SSPL/RSALv2 → préférer Valkey).
