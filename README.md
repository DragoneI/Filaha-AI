<p align="center">
  <img src="banner.png" alt="Filaha.AI Logo" width="100%"/>
</p>

# 🌿 Filaha.AI — RAG & Data Engineering Pipeline

> **Module Backend & Pipeline de Traitement de Données**
> Ce dépôt privé contient l'ensemble des scripts Python d'ingestion, d'embedding, de gestion vectorielle et de test pour la plateforme **Filaha.AI**, un assistant agronomique gratuit destiné aux petits et moyens agriculteurs marocains.

---

## 📌 Présentation du projet

**Filaha.AI** est une PWA (Progressive Web App) qui permet à un agriculteur de poser une question à voix haute ou d'envoyer une photo d'une feuille malade, en arabe ou en français, et de recevoir un conseil agronomique fiable et sourcé — sans compte, sans installation, gratuitement.

Ce dépôt gère l'arrière-cuisine du projet (*data pipeline*) :

1. **Ingestion** des guides agronomiques (FAO, INRA, IAV Hassan II, ONCA, ICARDA/CGIAR) et reformulation des faits en chunks exploitables.
2. **Découpage & vectorisation (*embeddings*)** des données textuelles.
3. **Synchronisation** avec la base de données vectorielle **Supabase** (`pgvector`).
4. **Tests automatisés** du pipeline de récupération (retrieval) et de la logique RAG, exécutés en CI à chaque push.

> ℹ️ **Le diagnostic visuel (Computer Vision) et la génération de réponses en production tournent ailleurs**, sur le Cloudflare Worker du dépôt frontend (`worker.js`) — via Groq (Llama 3.3 texte, Llama 3.2 Vision) avec repli automatique sur Cloudflare Workers AI. Les scripts de vision présents ici (`test_vision_model.py`) correspondent aux expérimentations menées en amont (modèles de classification Hugging Face) avant la bascule sur l'architecture de production actuelle.

---

## 🏗️ Architecture à deux dépôts

Le projet est volontairement séparé en deux dépôts pour isoler les secrets et la logique métier de l'interface publique :

| Dépôt | Visibilité | Contenu |
| :--- | :--- | :--- |
| **Frontend PWA** | Public | Interface utilisateur (`app.html`, `index.html`, `app.js`, `app.css`), Cloudflare Worker (`worker.js`, inférence + rate-limiting), Service Worker PWA |
| **Data & Backend** *(ce dépôt)* | Privé | Pipeline RAG (`rag_pipeline.py`), scripts d'ingestion/embeddings, secrets API, suite de tests automatisés et workflow CI |

Cette séparation garantit que chaque évolution du pipeline RAG (ré-embedding, enrichissement du corpus) reste testée et validée en isolation, sans jamais impacter le service en ligne tant que les tests ne passent pas.

---

## ⚙️ Stack technique

| Composant | Technologie | Rôle |
| :--- | :--- | :--- |
| Frontend | PWA (HTML/CSS/JS vanilla) | Interface mobile-first, installable, bilingue FR/AR (RTL) |
| Backend / Edge | Cloudflare Workers | Inférence serverless, rate-limiting, routage texte/vision |
| Base de données / Vector Store | Supabase (`pgvector`) | Recherche vectorielle par similarité pour le RAG |
| Génération & Vision | Groq API (Llama 3.3 / Llama 3.2 Vision) | Génération de réponses + repli Cloudflare Workers AI |
| Embeddings | Cloudflare Workers AI (`embeddinggemma-300m`) | Vectorisation des questions et des chunks (768 dimensions) |
| Ingestion & Tests | Python 3.10+ (pytest) | Chunking, vectorisation, alimentation Supabase, suite de tests |
| CI/CD | GitHub Actions | Exécution automatique de la suite de tests à chaque push |

---

## 📂 Structure du dépôt

| Fichier / Dossier | Description |
| :--- | :--- |
| `rag_pipeline.py` | Pipeline RAG principal (requête → embedding → retrieval Supabase → prompt) |
| `run_embeddings.py` | Génération et traitement des embeddings textuels |
| `_reembeded_chunks.py` | Script de ré-indexation des chunks (utilisé lors du changement de modèle d'embedding) |
| `upload_to_supabase.py` | Exportation et synchronisation des vecteurs vers Supabase |
| `chunks.json` | Base locale des fragments de texte agronomiques extraits et sourcés |
| `test_retrieval.py` | Tests de la recherche par similarité vectorielle (retrieval RAG) |
| `test_vision_model.py` | Tests des modèles de classification visuelle évalués en amont |
| `test_hybrid_pipeline.py` | Test du pipeline complet (retrieval + génération), avec mocks pour ne pas consommer les quotas API |
| `.env.example` | Modèle de configuration pour les variables d'environnement |
| `.github/workflows/` | Workflow GitHub Actions (exécution de pytest à chaque push) |

---

## ⚙️ Installation & configuration

Développé et maintenu depuis un environnement mobile (Pydroid 3), compatible Python 3.10+.

### 1. Cloner le dépôt et installer les dépendances

```bash
git clone https://github.com/DragoneI/Filaha.AI-python.git
cd Filaha.AI-python
pip install supabase python-dotenv requests pytest
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Renseigner dans `.env` :

```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

### 3. Lancer le pipeline d'ingestion

```bash
python run_embeddings.py      # génère les embeddings à partir de chunks.json
python upload_to_supabase.py  # synchronise les vecteurs vers Supabase
```

### 4. Lancer la suite de tests

```bash
pytest
```

Les tests utilisent des mocks pour la génération et l'analyse vision, afin de valider la logique du pipeline sans consommer de quota API.

---

## 🧪 Assurance qualité & CI/CD

- **Tests automatisés (pytest)** : suite de tests unitaires et d'intégration couvrant le retrieval vectoriel et le pipeline hybride, avec mocks pour s'affranchir des quotas API Groq/Cloudflare.
- **Intégration continue (GitHub Actions)** : la suite de tests s'exécute automatiquement à chaque push/commit, empêchant toute régression du pipeline RAG d'atteindre la production.

---

## 🔄 Flux de fonctionnement global

```
                            [ Agriculteur ]
                                   │
                                   ▼ (question texte ou photo)
                        [ Cloudflare Workers ]
                                   │
                   ┌───────────────┴───────────────┐
                   │ Vérification IP / Token appareil │
                   └───────────────┬───────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼ (analyse d'image)                                  ▼ (question texte)
[ Groq Llama 3.2 Vision ]                            [ Supabase pgvector ]
   + repli Cloudflare AI                                       │
         │                                                     ▼ (contexte RAG extrait)
         │                                            [ Groq Llama 3.3 ]
         │                                              + repli Cloudflare AI
         └─────────────────────────┬─────────────────────────┘
                                   │
                                   ▼
                   [ Diagnostic & conseil déterministe ]
```

---

## 📚 Sources & licences des données agronomiques

Le corpus est constitué exclusivement de sources légalement réutilisables, reformulées (jamais copiées verbatim) :

- **FAO / AGRIS** — guides techniques (olivier, tomate), licence CC BY-NC-SA
- **ICARDA / CGIAR** — référentiels céréales (blé, orge), licence CC-BY
- **INRA Maroc / IAV Hassan II** — bulletins PNTTA (agrumes), publications techniques, auteurs nommés
- **International Olive Council** — "Production Techniques in Olive Growing"
- **data.gov.ma** (Open Data), **PlantVillage / Hugging Face / Kaggle** (CC0/CC-BY) pour les expérimentations vision

Les documents institutionnels marocains (INRA/ONCA) non explicitement sous licence ouverte sont utilisés uniquement sous forme de faits reformulés, jamais de copie verbatim.

---

## 📄 Licence

Ce dépôt est **privé** — usage strictement personnel, tous droits réservés par défaut (pas de licence open source nécessaire ici).

Le dépôt **frontend public** de Filaha.AI est distribué sous licence **MIT**.

---

## 🔗 Liens

- App en production : [filaha-ai.vercel.app](https://filaha-ai.vercel.app)
- Dépôt frontend (public) : [github.com/DragoneI](https://github.com/DragoneI)
