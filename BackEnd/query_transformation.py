from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from config import GOOGLE_API_KEY

class QueryTransformer:
    def __init__(self, model="gemini-2.5-flash", temperature=0.1):
        # Prompt definition
        self.transform_prompt = ChatPromptTemplate.from_template("""
        Bạn là một AI phân tích ngôn ngữ. Nhiệm vụ của bạn là làm rõ câu hỏi của người dùng dựa trên lịch sử hội thoại.
        
        Quy tắc:
        1. Sửa lỗi chính tả, viết tắt (VD: "ko" -> "không", "wfh" -> "làm việc từ xa").
        2. NẾU câu hỏi có chứa nhiều ý, hoặc chứa các từ như "và", "gồm", "bao gồm", BẮT BUỘC phải tách chúng thành các câu hỏi đơn lẻ và ngăn cách bằng dấu "|".
           - Ví dụ 1: "Giới thiệu về team data, gồm quản lý và thành viên" 
             -> Sửa thành: "Giới thiệu chức năng của team data|Ai là quản lý team data?|Ai là thành viên team data?"
           - Ví dụ 2: "Chính sách nghỉ phép và WFH" 
             -> Sửa thành: "Chính sách nghỉ phép như thế nào?|Chính sách WFH như thế nào?"
        4. NẾU câu hỏi chỉ có 1 ý, hãy giữ nguyên ý chính.

        Chỉ trả về kết quả theo định dạng sau, không giải thích gì thêm:
        Kết quả: <câu hỏi đã làm rõ 1>|<câu hỏi đã làm rõ 2>

        Lịch sử trò chuyện gần đây: 
        {history}
        
        Câu hỏi gốc của người dùng: 
        {query}
        """)

        self.model = ChatGoogleGenerativeAI(model=model, temperature=temperature, api_key=GOOGLE_API_KEY)
        self.parser = StrOutputParser()

    def transform(self, raw_query, history):
        prompt = self.transform_prompt.format_prompt(query=raw_query, history=history)
        response = self.parser.parse(self.model.invoke(prompt).content)
        
        lines = response.split("\n")
        result = lines[0].replace("Kết quả:", "").strip()
        
        return result.split("|") if result else [raw_query]