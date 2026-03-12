from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import FastEmbedSparse
from langchain_classic.memory import ConversationBufferWindowMemory
from langchain_core.runnables import RunnableSequence

from query_transformation import QueryTransformer
from retrieval import Retriever
from config import GOOGLE_API_KEY

class ChatBot:
    def __init__(self, embedding_model='bkai-foundation-models/vietnamese-bi-encoder', sparse_embedding="Qdrant/BM25"):
        print("Initializing Embedding Models...")
        self.embedding_model = HuggingFaceEmbeddings(model_name=embedding_model)
        self.sparse_embedding = FastEmbedSparse(model_name=sparse_embedding)

        print("Initializing Query Transformer...")
        self.query_transform = QueryTransformer()

        print("Initializing Retriever (with PhoRanker)...")
        self.retriever = Retriever(self.embedding_model, self.sparse_embedding)

        print("Initializing LLM...")
        # Enable native streaming in the LLM config
        self.llm = ChatGoogleGenerativeAI(
            api_key=GOOGLE_API_KEY, 
            model="gemini-2.5-flash", 
            streaming=True,
            temperature=0.2
        )

        # Memory buffer to keep track of last 3 interactions
        self.memory = ConversationBufferWindowMemory(
            memory_key="history",
            input_key="query",
            return_messages=False,
            ai_prefix="AI",
            human_prefix="User",
            k=3  
        )

        # Prompt template designed specifically for Pizza Hut / JRG Context
        self.prompt_template = """
        Bạn là "JRG Assistant", một trợ lý AI nội bộ chuyên nghiệp, thân thiện của Jardine Restaurant Group (JRG) - cụ thể là hỗ trợ cho Pizza Hut Việt Nam và Data Team.
        
        Nhiệm vụ của bạn là trả lời câu hỏi của người dùng dựa trên NGỮ CẢNH (Context) được cung cấp dưới đây.

        Quy tắc trả lời:
        1. NẾU NGỮ CẢNH CÓ THÔNG TIN: Hãy trả lời chi tiết, chính xác dựa trên ngữ cảnh. 
        2. CHỈ TRÍCH DẪN NGUỒN NẾU CẦN THIẾT: Nếu thông tin lấy từ tài liệu nào, có thể nhắc nhẹ nhàng (VD: "Theo Sổ tay nhân sự 2024...").
        3. NẾU LÀ CÂU HỎI GIAO TIẾP THÔNG THƯỜNG (Smalltalk như Xin chào, Cảm ơn, Bạn khỏe không...): Hãy trả lời thân thiện, lịch sự với tư cách là trợ lý JRG mà không cần dùng ngữ cảnh.
        4. NẾU NGỮ CẢNH KHÔNG CHỨA CÂU TRẢ LỜI: Hãy thẳng thắn nói "Xin lỗi, hiện tại tôi chưa có thông tin về vấn đề này trong hệ thống dữ liệu của JRG." KHÔNG tự bịa ra thông tin.
        5. KHÔNG BAO GIỜ nói các câu như: "Dựa vào ngữ cảnh được cung cấp..." hay "Theo văn bản trên...". Hãy nói chuyện tự nhiên.

        Ngữ cảnh truy xuất từ hệ thống:
        {context}

        Lịch sử trò chuyện gần đây:
        {history}

        Câu hỏi của người dùng: 
        {query}
        
        Trả lời:
        """

        self.prompt = PromptTemplate(
            input_variables=["context", "history", "query"],
            template=self.prompt_template,
        )

        # Using modern Langchain Expression Language (LCEL) chain
        self.chain = self.prompt | self.llm

    def process_query_stream(self, raw_query):
        print('\n--- NEW REQUEST ---')
        print(f'RAW QUERY: {raw_query}')
        
        # Step 1: Extract history from memory
        history = self.memory.load_memory_variables({})["history"]
        
        # Step 2: Transform query (Handle pronouns, spelling, splitting)
        converted_queries = self.query_transform.transform(raw_query, history)
        print(f'TRANSFORMED QUERIES: {converted_queries}')
        
        # Step 3: Retrieve context from Qdrant
        context = self.retriever.retrieve(converted_queries)
        print(f'CONTEXT RETRIEVED:\n{context}')
        
        # Step 4: Generate response and yield stream natively
        print('GENERATING RESPONSE...')
        full_response = ""
        
        # Native streaming from Gemini
        for chunk in self.chain.stream({
            "context": context, 
            "history": history, 
            "query": raw_query
        }):
            content = chunk.content
            full_response += content
            yield content 

        # Step 5: Save context to memory after full response is generated
        self.memory.save_context({"query": raw_query}, {"output": full_response})
        print('--- REQUEST COMPLETED ---\n')