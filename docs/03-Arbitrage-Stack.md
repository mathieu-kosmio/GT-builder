# GT-builder — Arbitrage de stack recommandé

> Décision d'architecture : le meilleur compromis entre indépendance, facilité de déploiement et couverture fonctionnelle.

**Version** 0.1  •  **Date** 19 juin 2026  •  Complément de `00-Specification-Fonctionnelle` et `02-Briques-Composants-OSS`

---

## 1. Le principe directeur

**Indépendance sur la donnée et la logique. Pragmatisme souverain sur le calcul.**

Les trois objectifs sont en tension : tout auto-héberger maximise l'indépendance mais détruit la simplicité ; tout déléguer à du SaaS simplifie mais crée du lock-in. L'optimum n'est pas un point unique sur ce curseur, il vient d'une distinction :

- **Ce qui est portable et léger à héberger** (base de données, éditeur, application, pages publiques) reste **100 % chez toi, en licences permissives**. Coût d'indépendance quasi nul.
- **Ce qui est cher et complexe à exploiter** (GPU pour la transcription et le LLM) est **loué à un fournisseur souverain français** (Mistral via OVHcloud/Scaleway), derrière une **couche d'abstraction** qui te permet de l'internaliser plus tard si le volume le justifie.

Résultat : ton actif stratégique (données + code métier) n'a aucun lock-in, et tu n'assumes pas d'ops GPU dès le départ.

---

## 2. La stack retenue

| Couche | Choix | Licence | Pourquoi c'est l'optimum |
|---|---|---|---|
| Application | **Next.js** (ou SvelteKit) | MIT | Ton produit. Un seul socle front + API |
| Données | **PostgreSQL** + **pgvector** | permissive | Multi-tenant par RLS, recherche sémantique incluse, zéro brique en plus |
| Éditeur livrable | **Tiptap + Yjs + Hocuspocus** | MIT | Co-édition temps réel mature ; fournit aussi le temps réel applicatif |
| Logique différenciante | **code maison** (propositions diffables traçées + workflow de validation) | — | Le seul vrai « build ». C'est la promesse produit, elle doit t'appartenir |
| Auth | **app-level** au MVP, **Keycloak** en option | Apache 2.0 | Simple d'abord ; OIDC/SAML quand une fédération a un annuaire |
| Stockage fichiers | **Object Storage Scaleway/OVH** (S3) | service FR | Pas de conteneur à exploiter ; **Garage** (FR, AGPL) si full self-host plus tard |
| File de jobs | **Valkey + BullMQ** | BSD + MIT | Transcription/IA en tâches de fond. Valkey évite le piège de licence Redis |
| Transcription | **faster-whisper sur GPU OVH/Scaleway** (managé), **LinTO** ensuite | MIT / AGPL | Souverain sans ops GPU ; LinTO pour durcir la souveraineté en V1 |
| LLM | **Mistral via OVHcloud/Scaleway**, derrière **LiteLLM** | API FR / MIT | Modèle + hébergeur + droit français. Abstraction = pas de lock-in fournisseur |
| PDF charté | **Gotenberg** | MIT | API HTTP en un conteneur, robuste |
| Pages publiques | **Astro** | MIT | Génération statique rapide, multi-domaine, SEO |
| Déploiement | **docker-compose** sur **Clever Cloud** ou **Scaleway** | — | PaaS français = déploiement souverain le plus simple |

Tout le chemin critique est en licence **permissive et portable**. Aucune brique source-available (Outline, Directus, Redis) n'est sur ce chemin.

---

## 3. Ce qu'on ne fait PAS (pour protéger la simplicité)

L'optimum se défend aussi par les non-choix :

- **Pas de Supabase self-host complet au MVP.** Il regroupe beaucoup, mais sa pile self-host est lourde (nombreux conteneurs). Postgres seul + Hocuspocus (déjà nécessaire) couvre le temps réel ; on évite des conteneurs. On garde Supabase comme option si on veut accélérer, sachant qu'il reste du Postgres standard donc portable.
- **Pas de fork de Docmost ni d'un wiki existant.** Adapter un socle AGPL pour y greffer le diff/provenance reviendrait à se battre contre l'outil, sur le code qui fait notre valeur. On bâtit cette couche sur Tiptap.
- **Pas de GPU auto-hébergé au MVP.** On loue souverain. L'internalisation (vLLM) ne se justifie qu'au volume.
- **Pas de CMS de publication (Strapi/Payload) au MVP.** Astro suffit pour publier. On ajoute un CMS seulement si une fédération veut piloter finement ses contenus.

---

## 4. Trajectoire d'indépendance (sans réarchitecture)

L'arbitrage est conçu pour que la souveraineté **augmente avec le temps**, par simple substitution derrière les abstractions :

1. **MVP** : Postgres + Tiptap/Yjs + faster-whisper managé + Mistral managé + Astro. Permissif, portable, déployé sur PaaS FR.
2. **V1** : transcription **LinTO**, hébergement **SecNumCloud** pour tenants sensibles, stockage **Garage**.
3. **V2** : LLM internalisé **vLLM** sur GPU dédié si le volume le justifie ; LinkedIn API complète.

À chaque étape, on remplace un composant derrière son interface (LiteLLM pour le LLM, l'adaptateur de transcription, le driver S3) sans toucher au métier.

---

## 5. Verdict en une ligne

**Postgres + Tiptap/Yjs/Hocuspocus + faster-whisper et Mistral souverains managés + Astro + Gotenberg, en docker-compose sur Clever Cloud/Scaleway.** Indépendance maximale là où elle est gratuite, souveraineté louée là où l'auto-hébergement coûte cher, et une trajectoire qui resserre la souveraineté version après version sans jamais réécrire le cœur.
