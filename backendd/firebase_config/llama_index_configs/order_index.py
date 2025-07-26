import os
from llama_index.core import VectorStoreIndex, StorageContext, load_index_from_storage
from firebase_config.llama_index_configs.global_settings import global_settings 

from llama_index.vector_stores.qdrant import QdrantVectorStore
from llama_index.core import VectorStoreIndex, StorageContext



def build_orders_index(documents):
    settings = global_settings()
    embed_model = settings["embed_model"]
    qdrant_client = settings["qdrant_client"]

    vector_store = QdrantVectorStore(
        client=qdrant_client,
        collection_name="orders",
    )

    storage_context = StorageContext.from_defaults(vector_store=vector_store)
    index = VectorStoreIndex.from_documents(documents, storage_context=storage_context)

    # ❌ No persist_dir
    # index.storage_context.persist(persist_dir=index_path)  <-- Remove this



def load_orders_index():
    settings = global_settings()
    qdrant_client = settings["qdrant_client"]

    # Load from Qdrant Cloud (vector store only, no local metadata)
    vector_store = QdrantVectorStore(
        client=qdrant_client,
        collection_name="orders",
    )

    # Create index directly from Qdrant vector store
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    return VectorStoreIndex.from_vector_store(vector_store=vector_store, storage_context=storage_context)


