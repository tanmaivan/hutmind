import json
import os
from dotenv import load_dotenv
from qdrant_client import models
from langchain_qdrant import QdrantVectorStore, FastEmbedSparse, RetrievalMode
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Safely resolve absolute paths to avoid directory execution issues
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, '..', '.env')
load_dotenv(env_path)

QDRANT_COLLECTION_NAME = os.getenv('QDRANT_COLLECTION_NAME', 'jrg_bot_collection')
QDRANT_URL = os.getenv('QDRANT_URL')
QDRANT_API_KEY = os.getenv('QDRANT_API_KEY')

def load_and_chunk_data(file_path):
    """Load JSON data and split into smaller chunks for optimal retrieval."""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    raw_documents = []
    for item in data:
        source = item.get('metadata', {}).get('source', 'Unknown')
        print(f"Loading document from source: {source} ...")
        
        raw_documents.append(Document(
            page_content=item.get('content', ''),
            metadata=item.get('metadata', {})
        ))

    # Text Splitter to prevent context window overflow when data grows
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    
    docs = text_splitter.split_documents(raw_documents)
    print(f"Successfully loaded and split into {len(docs)} chunks.")
    return docs

def main():
    json_path = os.path.join(current_dir, 'jrg_data.json')
    documents = load_and_chunk_data(json_path)

    print("Initializing Embedding Models (Dense & Sparse)...")
    # Dense Embedding for semantic search
    model_name = 'bkai-foundation-models/vietnamese-bi-encoder'
    embedding_model = HuggingFaceEmbeddings(model_name=model_name)
    
    # Sparse Embedding for keyword search (BM25)
    sparse_embeddings = FastEmbedSparse(model_name="Qdrant/BM25")

    print("Uploading data to Qdrant Cloud...")
    # Save to Qdrant using Hybrid Search
    vectorstore = QdrantVectorStore.from_documents(
        documents, 
        embedding_model, 
        sparse_embedding=sparse_embeddings,
        retrieval_mode=RetrievalMode.HYBRID,
        url=QDRANT_URL, 
        api_key=QDRANT_API_KEY,
        collection_name=QDRANT_COLLECTION_NAME,
        distance=models.Distance.COSINE,
        force_recreate=True  # Avoid duplicating data on multiple runs
    )

    print(f"SUCCESS: Data has been saved to Qdrant collection '{QDRANT_COLLECTION_NAME}'.")

if __name__ == "__main__":
    main()