import json
import os
import glob
from dotenv import load_dotenv
from qdrant_client import models
from langchain_qdrant import QdrantVectorStore, FastEmbedSparse, RetrievalMode
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

# 1. Setup paths
current_dir = os.path.dirname(os.path.abspath(__file__))
# Assuming .env is located in the parent directory (pizzahut/)
env_path = os.path.join(current_dir, '..', '.env') 
load_dotenv(env_path)

QDRANT_COLLECTION_NAME = os.getenv('QDRANT_COLLECTION_NAME', 'jrg_bot_collection')
QDRANT_URL = os.getenv('QDRANT_URL')
QDRANT_API_KEY = os.getenv('QDRANT_API_KEY')

def load_all_json_files(data_dir):
    """Scan and convert all .json files in the data directory into Langchain Documents"""
    raw_documents = []
    
    # Find all .json files in the current directory
    json_files = glob.glob(os.path.join(data_dir, "*.json"))
    
    print(f"--- STARTING DATA INGESTION: FOUND {len(json_files)} JSON FILES ---")
    
    for file_path in json_files:
        file_name = os.path.basename(file_path)
        print(f"Reading file: {file_name}...")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
                for item in data:
                    content = item.get('content', '').strip()
                    if not content:
                        continue
                        
                    raw_documents.append(Document(
                        page_content=content,
                        metadata=item.get('metadata', {})
                    ))
            except json.JSONDecodeError:
                print(f"ERROR: JSON syntax error in file: {file_name}")
    
    print(f"Successfully loaded {len(raw_documents)} raw documents.")
    
    # Text Splitter: Crucial for optimizing context window and memory limits
    print("Initializing Text Splitter for chunking...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,      
        chunk_overlap=100    
    )
    
    final_docs = text_splitter.split_documents(raw_documents)
    print(f"Data has been split into {len(final_docs)} optimal chunks ready for VectorDB.")
    
    return final_docs

def main():
    if not QDRANT_URL or not QDRANT_API_KEY:
        print("CRITICAL ERROR: QDRANT_URL or QDRANT_API_KEY not found in .env file.")
        return

    # 2. Process data
    documents = load_all_json_files(current_dir)

    if not documents:
        print("WARNING: No data found to ingest. Please check your JSON files.")
        return

    # 3. Initialize AI Embedding Models
    print("Initializing Hybrid Embedding Models (Dense & Sparse)...")
    
    # Dense Model: For semantic search (Vietnamese optimized)
    model_name = 'bkai-foundation-models/vietnamese-bi-encoder'
    print(f"Loading Dense Model: {model_name}...")
    embedding_model = HuggingFaceEmbeddings(model_name=model_name)
    
    # Sparse Model: For exact keyword matching (BM25)
    print("Loading Sparse Model: Qdrant/BM25...")
    sparse_embeddings = FastEmbedSparse(model_name="Qdrant/BM25")

    # 4. Upload to Qdrant Cloud
    print(f"Uploading vectors to Qdrant Collection: '{QDRANT_COLLECTION_NAME}'...")
    print("This process may take a few minutes depending on the data size. Please do not close the terminal...")
    
    vectorstore = QdrantVectorStore.from_documents(
        documents, 
        embedding_model, 
        sparse_embedding=sparse_embeddings,
        retrieval_mode=RetrievalMode.HYBRID,
        url=QDRANT_URL, 
        api_key=QDRANT_API_KEY,
        collection_name=QDRANT_COLLECTION_NAME,
        distance=models.Distance.COSINE,
        force_recreate=True  # WARNING: This will drop the existing collection and recreate it
    )

    print("SUCCESS: The entire Knowledge Base has been uploaded to Qdrant Cloud!")

if __name__ == "__main__":
    main()