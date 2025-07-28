import os
import logging
from dotenv import load_dotenv
from llama_index.core import Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
# from llama_index.embeddings import HuggingFaceEmbedding
from qdrant_client import QdrantClient
from llama_index.vector_stores.qdrant import QdrantVectorStore
from sentence_transformers import SentenceTransformer

# 🗝 Load env
load_dotenv()

# 🔐 Qdrant setup
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if not QDRANT_URL or not QDRANT_API_KEY:
    logger.error("❌ QDRANT credentials missing")
    raise ValueError("Set QDRANT_URL and QDRANT_API_KEY in .env")

# Initialize Qdrant client
qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
logger.info("✅ Qdrant client initialized")

# Load transformer model
# ST_MODEL = "all-MiniLM-L6-v2"
ST_MODEL = "paraphrase-MiniLM-L3-v2"
logger.info(f"🧠 Loading SentenceTransformer model: {ST_MODEL}")
st_model = SentenceTransformer(ST_MODEL)
embed_model = HuggingFaceEmbedding(model_name=ST_MODEL)
Settings.embed_model = embed_model
Settings.llm = None

logger.info("🧠 Settings.embed_model set successfully")

def global_settings():
    return {
        "embed_model": embed_model,
        "qdrant_client": qdrant_client
    }