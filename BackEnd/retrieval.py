import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from langchain_qdrant import QdrantVectorStore, RetrievalMode
from config import QDRANT_COLLECTION_NAME, QDRANT_URL, QDRANT_API_KEY

class Retriever:
    def __init__(self, embedding_model, sparse_embedding, rerank_model="itdainb/PhoRanker"):
        # Initialize Qdrant Vector Store
        self.vector_store = QdrantVectorStore.from_existing_collection(
            embedding=embedding_model,
            collection_name=QDRANT_COLLECTION_NAME,
            url=QDRANT_URL,
            api_key=QDRANT_API_KEY,
            sparse_embedding=sparse_embedding,
            retrieval_mode=RetrievalMode.HYBRID,
        )
        self.retriever = self.vector_store.as_retriever(search_kwargs={"k": 10}) # Fetch top 7 initially

        # Initialize Cross-Encoder (PhoRanker) for highly accurate Vietnamese reranking
        print("Loading PhoRanker model...")
        self.tokenizer = AutoTokenizer.from_pretrained(rerank_model)
        self.rerank_model = AutoModelForSequenceClassification.from_pretrained(rerank_model)

    def rerank(self, query, documents):
        if not documents:
            return []
        
        # Tokenize query and documents for Cross-Encoder
        inputs = self.tokenizer([query] * len(documents), documents, return_tensors="pt", padding=True, truncation=True)

        # Calculate similarity scores
        with torch.no_grad():
            outputs = self.rerank_model(**inputs)
            scores = outputs.logits.squeeze().tolist()
            
        if isinstance(scores, float):
            scores = [scores]

        # Sort documents by score descending
        indexed_documents = list(zip(range(len(documents)), scores))
        indexed_documents.sort(key=lambda x: x[1], reverse=True)
        
        # Return sorted indices
        ranked_indices = [i for i, _ in indexed_documents]
        return ranked_indices

    def retrieve(self, queries, top_n=6):
        """Retrieve and rerank documents for a list of queries."""
        full_context = ""
        seen_docs = set() # To avoid duplicate documents
        
        for query in queries:
            # 1. Initial retrieval using Hybrid Search (Dense + BM25)
            results = self.retriever.invoke(query)
            
            if not results:
                continue

            # 2. Reranking using PhoRanker
            docs_content = [doc.page_content for doc in results]
            ranked_indices = self.rerank(query, docs_content)
            
            # 3. Format context string
            for i, idx in enumerate(ranked_indices[:top_n]):
                best_doc = results[idx]
                # Check if document content is already in seen_docs
                if best_doc.page_content not in seen_docs:
                    seen_docs.add(best_doc.page_content)
                    source = best_doc.metadata.get("source", "Internal Knowledge Base")
                    full_context += f"- [Source: {source}]: {best_doc.page_content}\n"
                
        return full_context.strip()