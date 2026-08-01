<p align="center">
  <img src="banner.png" alt="Lion AI Logo" width="100%"/>
</p>

🌿 Filaha.AI — RAG & Data Engineering Pipeline

> **Module Backend & Pipeline de Traitement de Données**  
> Ce dépôt privé contient l'ensemble des scripts Python d'ingestion, d'embedding, de gestion vectorielle et d'analyse hybride (Vision + LLM) pour la plateforme **Filaha.AI**.

---

## 📌 Présentation du Projet

**Filaha.AI** est un assistant agronomique intelligent conçu pour répondre aux besoins réels des petits et moyens agriculteurs au Maroc. Ce module Python gère l'arrière-cuisine du projet (*Data Pipeline*) :

1. **Ingestion des guides agronomiques** (FAO, INRA, ONCA).
2. **Découpage & Vectorisation (*Embeddings*)** des données textuelles.
3. **Synchronisation** avec la base de données vectorielle **Supabase** (`pgvector`).
4. **Pipeline Hybride** associant vision par ordinateur (détection de symptômes sur feuilles/fruits) et recherche contextuelle (RAG) pour un diagnostic anti-hallucination.

---

## 📂 Structure du Dépôt

| Fichier / Dossier | Description |
| :--- | :--- |
| `rag_pipeline.py` | Pipeline RAG principal (requêtes contextuelles + prompt système) |
| `run_embeddings.py` | Génération et traitement des embeddings textuels |
| `_reembeded_chunks.py` | Script de ré-indexation des segments de texte (chunks) |
| `upload_to_supabase.py` | Exportation et synchronisation des vecteurs vers Supabase |
| `chunks.json` | Base locale des fragments de texte agronomiques extraits |
| `test_retrieval.py` | Tests unitaires de la recherche par similarité vectorielle |
| `test_vision_model.py` | Tests du module d'analyse visuelle par ordinateur |
| `test_hybrid_pipeline.py` | Test du pipeline complet (Vision + RAG + Génération) |
| `.env.example` | Modèle de configuration pour les variables d'environnement |

---

## ⚙️ Configuration & Installation (Pydroid 3 / Python 3.10+)

### 1. Cloner le projet & installer les dépendances
```bash
git clone [https://github.com/ton-username/Filaha.AI-python.git](https://github.com/ton-username/Filaha.AI-python.git)
cd Filaha.AI-python
pip install supabase python-dotenv google-generativeai requests
