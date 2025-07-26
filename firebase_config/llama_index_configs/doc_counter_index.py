from llama_index.core import VectorStoreIndex, StorageContext
from firebase_config.llama_index_configs.global_settings import global_settings
from llama_index.vector_stores.qdrant import QdrantVectorStore

def build_doc_counter_index(documents):
    settings = global_settings()
    qdrant_client = settings["qdrant_client"]

    vector_store = QdrantVectorStore(
        client=qdrant_client,
        collection_name="doc_counter",
    )

    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    index = VectorStoreIndex.from_documents(documents, storage_context=storage_context)

def load_doc_counter_index():
    settings = global_settings()
    qdrant_client = settings["qdrant_client"]

    vector_store = QdrantVectorStore(
        client=qdrant_client,
        collection_name="doc_counter",
    )

    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    return VectorStoreIndex.from_vector_store(vector_store=vector_store, storage_context=storage_context)
