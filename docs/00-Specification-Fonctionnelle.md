# GT-builder — Spécification fonctionnelle

> Plateforme légère de production collaborative de livrables pour les groupes de travail des fédérations, pôles de compétitivité et associations professionnelles.

**Version** 0.1 (cadrage)  •  **Date** 19 juin 2026  •  **Auteur** Mathieu / Kosmio
**Positionnement retenu** Maximum souverain / open-source, quitte à assembler  •  **Posture IA** L'assistant suggère, l'humain valide

---

## 1. Problème et proposition de valeur

### 1.1 Le problème

Les fédérations, pôles de compétitivité et associations professionnelles animent des **groupes de travail** réunissant leurs membres autour d'un enjeu commun (transition environnementale, normalisation, plaidoyer, structuration d'une filière, conception d'un outil numérique partagé). Ces groupes représentent un volume important de **jours/homme bénévoles ou cofinancés**, mobilisés en réunions successives.

Ce travail collectif souffre de trois pertes de valeur récurrentes :

1. **Déperdition entre réunions.** La connaissance produite reste dans les têtes, les mails et des comptes rendus hétérogènes. Chaque réunion repart partiellement de zéro.
2. **Livrable tardif et coûteux.** Le passage des échanges à un livrable structuré (guide, plaidoyer, livre blanc, référentiel, spécification d'outil) se fait en fin de cycle, dans la douleur, souvent par une seule personne.
3. **Sous-valorisation.** Le résultat est peu mis en forme, peu publié, peu attribué. L'investissement collectif reste invisible et difficile à capitaliser d'un groupe à l'autre.

### 1.2 La proposition de valeur

GT-builder transforme le **flux des réunions** en un **livrable commun qui se construit progressivement**, puis le met en forme et le publie. Le produit tient en une promesse : *« de la réunion au livrable publié, sans rupture de charge ».*

Trois mouvements, dans l'ordre du cycle de vie d'un groupe :

- **Capter** : organiser les réunions, récupérer les transcripts, en tirer un compte rendu validé.
- **Construire** : alimenter et faire évoluer le livrable section par section à partir de ces comptes rendus, sous contrôle humain.
- **Publier** : mettre en forme selon une charte graphique, exporter et diffuser sur le site et les réseaux (LinkedIn en priorité).

### 1.3 Ce que GT-builder n'est pas (non-objectifs MVP)

- Un outil de visioconférence (on s'interface avec l'existant : Jitsi, Visio de l'État, Teams, Meet).
- Un éditeur de PAO avancé (on vise une mise en forme « propre et chartée », pas du print haut de gamme).
- Une GED généraliste ni un intranet complet.
- Un réseau social interne.

---

## 2. Cibles et personas

### 2.1 Organisations cibles

| Segment | Caractéristiques | Tenant type |
|---|---|---|
| Fédération professionnelle | Plusieurs commissions / GT permanents, forte production de positions et guides | 1 tenant, 5 à 30 GT |
| Pôle de compétitivité | GT projets et thématiques, logique consortium, livrables techniques | 1 tenant, 10 à 50 GT |
| Association / cluster | GT plus légers, plaidoyer et partage de bonnes pratiques | 1 tenant, 2 à 15 GT |

Multi-tenant : chaque organisation est un espace isolé (données, membres, charte, sous-domaine).

### 2.2 Personas

- **Animateur de GT (utilisateur central).** Permanent de la fédération ou membre désigné. Organise les réunions, lance la génération du CR, arbitre les propositions de l'IA, fait avancer le livrable. C'est lui qui valide. Veut gagner du temps sans perdre le contrôle éditorial.
- **Membre contributeur.** Représentant d'une organisation adhérente. Participe aux réunions, lit et commente le livrable en cours, propose des modifications. Faible disponibilité, faible appétence outil : l'expérience doit être quasi sans apprentissage.
- **Responsable communication / direction.** Récupère le livrable fini, le publie, le valorise. Veut une sortie chartée et une diffusion en un clic.
- **Administrateur du tenant.** Gère les GT, les droits, la charte graphique, les connecteurs (transcription, LLM, réseaux). Une personne côté fédération.
- **Administrateur plateforme (Kosmio / opérateur SaaS).** Gère les tenants, l'infrastructure, les quotas, les mises à jour.

---

## 3. Parcours utilisateur cible

Le cycle de vie d'un livrable, vu de l'animateur :

1. **Créer le GT** et son livrable cible (choix d'un gabarit : plaidoyer, guide, livre blanc, référentiel, spec outil). Le gabarit pré-remplit un plan type.
2. **Planifier une réunion** (date, ordre du jour, participants). Lien visio externe collé ou généré.
3. **Après la réunion**, déposer l'enregistrement ou le transcript (ou laisser un bot de captation le faire). GT-builder transcrit si besoin.
4. **Générer le compte rendu.** L'IA propose un CR structuré (présents, décisions, points, actions). L'animateur corrige et valide. Le CR validé devient une source.
5. **Proposer l'évolution du livrable.** À partir du CR validé, l'IA suggère des ajouts/modifications **section par section**, sous forme de propositions diffables. L'animateur accepte, amende ou rejette. Rien ne s'écrit dans le livrable sans validation.
6. **Itérer** réunion après réunion : le livrable se densifie, l'historique est tracé, chaque passage est attribuable à une réunion source.
7. **Finaliser et mettre en forme** selon la charte du tenant (couverture, typographies, couleurs, logos, sommaire).
8. **Publier** : export PDF/web, page publique sur le site, post LinkedIn généré et programmé.

Le membre contributeur, lui, reçoit une notification, lit le livrable en cours, commente, et voit d'où vient chaque paragraphe (réunion source).

---

## 4. Modules fonctionnels

### M1 — Espaces et groupes de travail
- Création de GT, description, objectif, livrable(s) rattaché(s).
- Membres et rôles par GT (animateur, contributeur, lecteur).
- Tableau de bord GT : prochaine réunion, état du livrable, actions ouvertes.

### M2 — Réunions
- Planification (date, ODJ, participants), rappel par mail.
- Dépôt d'enregistrement audio/vidéo **ou** de transcript existant **ou** captation automatique (bot).
- Stockage des pièces (slides, documents d'appui).
- Lien avec le compte rendu produit.

### M3 — Transcription
- Transcription automatique audio → texte, **français en priorité**.
- Diarisation (qui parle) pour faciliter l'attribution.
- Brique souveraine : LinTO (Linagora) ou Whisper/WhisperX auto-hébergé. Voir §6.
- Édition manuelle du transcript avant exploitation.

### M4 — Comptes rendus assistés
- Génération d'un CR structuré à partir du transcript (gabarit configurable : présents, ordre du jour, décisions, points de discussion, actions/échéances).
- **Workflow de validation** : brouillon IA → relecture animateur → CR validé.
- Le CR validé est figé, versionné, et devient une **source citable** pour le livrable.
- Extraction automatique des **actions** (qui, quoi, quand) vers un suivi.

### M5 — Livrable vivant (cœur du produit)
- Éditeur de document collaboratif structuré en sections (type wiki / Notion).
- **Gabarits de livrable** : plaidoyer, guide, livre blanc, référentiel, spécification d'outil numérique. Chaque gabarit fournit un plan et des consignes de ton.
- **Moteur de propositions IA** : à partir d'un CR validé, l'IA génère des propositions de modification ciblées par section, présentées en **diff** (avant/après).
- **Validation humaine obligatoire** : accepter / amender / rejeter chaque proposition. Journal des décisions.
- **Traçabilité** : chaque passage du livrable est relié à la ou aux réunions sources (provenance affichable).
- Versioning complet, commentaires en marge, mentions, statut par section (à rédiger / en discussion / validé).

### M6 — Mise en forme et charte
- Charte graphique par tenant : logo, couleurs, typographies, page de couverture, pied de page, mentions légales.
- Rendu du livrable selon la charte (couverture, sommaire automatique, numérotation).
- Prévisualisation web et impression (PDF).

### M7 — Publication et diffusion
- Export : PDF charté, page web publique (URL propre), Markdown/HTML.
- Publication sur le **site de la fédération** : page hébergée par GT-builder (sous-domaine ou domaine personnalisé) ou export vers le CMS existant.
- **LinkedIn** : génération d'un post (résumé + accroche + lien), programmation, publication sur la page organisation. Contrainte d'accès API à anticiper, voir §6.5.
- Capitalisation : bibliothèque des livrables publiés, réutilisable d'un GT à l'autre.

### M8 — Administration et gouvernance
- Gestion tenant : membres, GT, rôles, quotas, charte, connecteurs.
- Paramétrage IA : choix du fournisseur LLM, activation/désactivation par module, garde-fous (rien de publié sans validation).
- Journal d'audit (qui a validé quoi, quand) — essentiel pour la confiance et la gouvernance multi-acteurs.
- RGPD : consentement à l'enregistrement, durées de conservation, export et suppression des données.

---

## 5. Modèle de données (vue logique)

Entités principales et relations :

- **Tenant** (organisation) — possède une Charte, des Utilisateurs, des GT.
- **Utilisateur** — appartient à un Tenant, rattaché à un ou plusieurs GT avec un Rôle.
- **Groupe de travail (GT)** — appartient à un Tenant, contient des Réunions et un ou plusieurs Livrables.
- **Réunion** — appartient à un GT, possède un Transcript, produit un Compte rendu, génère des Actions.
- **Transcript** — rattaché à une Réunion (segments horodatés, locuteurs).
- **Compte rendu** — produit depuis un Transcript, état (brouillon / validé), versionné.
- **Action** — extraite d'un Compte rendu (responsable, échéance, statut).
- **Livrable** — appartient à un GT, basé sur un Gabarit, composé de Sections.
- **Section** — bloc de contenu du Livrable, statut éditorial, versions, **liens de provenance** vers des Comptes rendus.
- **Proposition** — modification suggérée par l'IA sur une Section (diff), état (proposée / acceptée / amendée / rejetée), liée à un CR source et à un Utilisateur validateur.
- **Charte** — paramètres de mise en forme du Tenant.
- **Publication** — instance publiée d'un Livrable (canal : web, PDF, LinkedIn ; date ; URL).

Le couple **Section ↔ Proposition ↔ Compte rendu** porte la promesse du produit (traçabilité réunion → livrable). C'est le schéma à soigner en premier.

---

## 6. Architecture technique et briques souveraines / OSS

Principe directeur : **assembler des briques matures plutôt que tout réécrire**, en privilégiant des licences réellement libres (compatibles revente SaaS) et un hébergement français.

### 6.1 Socle wiki / éditeur collaboratif

Le choix du socle documentaire est la décision la plus structurante. Comparatif des candidats open-source :

| Brique | Licence | Forces | Limites pour notre cas |
|---|---|---|---|
| **Docmost** | AGPL-3.0 | Type Notion, espaces/workspaces multiples, édition temps réel, commentaires, permissions. Vraiment libre. | Projet plus jeune, écosystème d'extensions limité. |
| **BookStack** | MIT | Très simple à déployer (app + base MariaDB), auth intégrée, stable. | Modèle de contenu rigide (étagères/livres/pages), moins « document vivant ». |
| **Outline** | **BSL** (non OSI) | Très bonne UX, temps réel, recherche. | **Licence restreignant l'usage SaaS commercial** : à écarter pour du multi-tenant revendu. PostgreSQL + Redis + S3 + SSO externe obligatoire. |
| **XWiki** | LGPL | Très puissant, multi-tenant natif, structuré. | Lourd, courbe d'apprentissage forte, à l'opposé du « léger ». |

**Recommandation MVP** : partir de **Docmost** (AGPL, multi-espaces, temps réel) comme socle d'édition et de structuration du livrable, ou **construire un socle léger maison** (éditeur ProseMirror/Tiptap + stockage) si l'on veut un contrôle total du diff/provenance. BookStack reste l'option « déploiement ultra-simple » si l'on accepte un modèle de contenu plus rigide.

> Point d'arbitrage à trancher : réutiliser Docmost et y greffer les modules réunion/CR/proposition, ou bâtir un socle sur mesure autour d'un éditeur (Tiptap) pour maîtriser finement la traçabilité section ↔ réunion. L'option Docmost accélère le MVP ; l'option sur mesure sert mieux la promesse différenciante à terme.

### 6.2 Transcription (souveraine)

- **LinTO** (Linagora) : pile de transcription française open-source, modèles entraînés sur des milliers d'heures de français, conçue dans une logique souveraine. Premier choix « souveraineté ».
- **Whisper / WhisperX** auto-hébergé : Whisper (modèle ouvert) + WhisperX (alignement mot à mot + diarisation via pyannote). Excellent rapport qualité/effort, déployable sur GPU français.
- Diarisation via **pyannote** pour l'attribution des prises de parole.

### 6.3 LLM (souverain) pour CR et propositions

- **Mistral** (éditeur français) comme modèle par défaut : combinaison modèle français + hébergeur français + droit français = configuration la plus souveraine.
- Servi via **OVHcloud AI Endpoints** (qualifié SecNumCloud — utile pour secteurs sensibles) ou **Scaleway Managed Inference** (GPU en France).
- **Albert API** (DINUM / OpenGateLLM) : pertinent si des tenants sont des acteurs publics ; passerelle LLM souveraine compatible standard OpenAI, avec RAG/OCR intégrés. À garder comme option, sachant que sa généralisation reste en cours d'évaluation (bilan attendu été 2026).
- Architecture **agnostique au fournisseur** : abstraction LLM compatible API OpenAI, pour basculer entre Mistral/OVH/Scaleway/Albert sans réécrire les modules.

### 6.4 Hébergement et déploiement

- Hébergeur souverain : **OVHcloud**, **Scaleway**, **Clever Cloud** ou **Outscale** (selon exigence SecNumCloud).
- **Conteneurisation Docker / docker-compose** pour un déploiement reproductible et « simple à déployer » (objectif explicite). Une stack = quelques conteneurs : app, base PostgreSQL, cache/queue, stockage objet S3-compatible, service de transcription.
- Multi-tenant : isolation par schéma de base ou par tenant logique, sous-domaine par organisation.
- Base : **PostgreSQL**. Stockage fichiers : **S3-compatible souverain** (Scaleway Object Storage, OVH).

### 6.5 Publication

- **Site web** : pages publiques rendues par GT-builder (sous-domaine/domaine custom) ou export statique vers le CMS existant de la fédération.
- **LinkedIn** : la publication automatisée sur une page organisation passe par la **Community Management API** (scope `w_organization_social`), produit **restreint nécessitant une validation LinkedIn** (Marketing Developer Platform). À anticiper : prévoir un **mode dégradé** « post généré prêt à coller » pour le MVP, et viser l'automatisation complète une fois l'accès API obtenu.
- Génération du **PDF charté** via moteur HTML→PDF (WeasyPrint ou navigateur headless) appliquant la charte du tenant.

### 6.6 Schéma d'assemblage (vue macro)

```
[Visio externe] --enregistrement/transcript--> [M2 Réunions]
                                                     |
                                          [M3 Transcription: LinTO / WhisperX]
                                                     |
                                          [M4 CR assisté: LLM Mistral via OVH/Scaleway]
                                                     | (CR validé = source)
                                          [M5 Livrable vivant: socle Docmost/Tiptap]
                                             ^  propositions IA diffables (validation humaine)
                                                     |
                                          [M6 Mise en forme: charte tenant + HTML→PDF]
                                                     |
                                          [M7 Publication: web public + LinkedIn API]
```

---

## 7. Posture IA : assistant qui suggère, humain qui valide

Choix structurant validé. Implications concrètes :

- **Aucune écriture automatique** dans un CR validé ni dans le livrable. L'IA produit toujours un **brouillon** ou une **proposition**.
- Tout passage généré est présenté en **diff** et **attribué à sa source** (réunion / transcript).
- **Journal de validation** horodaté et nominatif (qui a accepté quoi) : socle de confiance pour la gouvernance multi-acteurs et la responsabilité éditoriale collective.
- Garde-fous configurables par tenant (ex. double validation avant publication externe).
- Mention de provenance et, si souhaité, **mention « rédigé avec assistance IA, validé par le GT »** sur les livrables publiés, cohérent avec une exigence de transparence.

Cette posture sert aussi la conformité (AI Act, échéance août 2026 pour les systèmes à risque) : l'humain reste décideur, la traçabilité est native.

---

## 8. Roadmap produit (MVP → V2)

### MVP (« de la réunion au CR validé, et un livrable qui se densifie »)
Objectif : prouver la boucle de valeur centrale avec un GT pilote réel.

- M1 Espaces et GT (basique), M2 Réunions (dépôt manuel de transcript), M4 CR assisté + validation, M5 Livrable vivant avec propositions diffables et traçabilité, export PDF simple.
- Transcription : intégration d'**une** brique (WhisperX auto-hébergé pour démarrer).
- LLM : Mistral via OVH ou Scaleway, abstraction multi-fournisseur dès le départ.
- Multi-tenant minimal (isolation + sous-domaine), un tenant pilote.
- LinkedIn en **mode dégradé** (post généré à coller).

### V1 (« mise en forme et diffusion »)
- M6 Charte graphique complète par tenant, M7 publication web publique, gabarits de livrable enrichis.
- Transcription souveraine LinTO en option, diarisation.
- Captation automatique de réunion (bot) sur une plateforme visio.
- Suivi des actions (M4) consolidé.

### V2 (« automatisation et capitalisation »)
- LinkedIn API complète (après validation LinkedIn), publication multi-canal.
- Albert API en option pour tenants publics.
- Bibliothèque de capitalisation inter-GT, recherche transverse, recommandations.
- Indicateurs de valorisation (jours/homme captés, livrables produits, audience).

---

## 9. Risques et points d'arbitrage

| Sujet | Risque | Piste |
|---|---|---|
| Socle documentaire | Docmost (AGPL) impose AGPL au produit dérivé ; sur-mesure coûte plus cher | Trancher tôt : AGPL acceptable pour un commun numérique, sinon socle Tiptap propriétaire |
| Accès LinkedIn API | Validation longue et incertaine | Mode dégradé « copier-coller » dès le MVP, automatisation en V2 |
| Qualité transcription FR | Variable selon audio/diarisation | LinTO/WhisperX + édition manuelle systématique avant exploitation |
| Coût LLM | Volume de réunions = coût d'inférence | LLM souverain mutualisé, quotas par tenant, batch hors ligne |
| Confiance / gouvernance | Crainte que l'IA « écrive à la place du groupe » | Validation humaine native, traçabilité, journal d'audit affiché |
| Conformité | RGPD (enregistrements) + AI Act | Consentement, durées de conservation, humain décideur, transparence |

---

## 10. Questions ouvertes pour la suite

1. **Socle** : Docmost (rapide, AGPL) ou socle sur mesure Tiptap (différenciant, maîtrise du diff/provenance) ?
2. **Captation** : à quel point automatiser le lien visio → enregistrement → transcript dès le MVP ?
3. **Modèle économique** : abonnement par tenant ? par GT actif ? par volume de réunions transcrites ? Commun numérique cofinancé ?
4. **Hébergement** : SecNumCloud requis (acteurs publics / données sensibles) ou ISO 27001 suffisant pour le marché visé ?
5. **GT pilote** : quelle fédération/pôle pour le premier déploiement réel ?
