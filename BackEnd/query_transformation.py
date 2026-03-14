from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from BackEnd.config import GOOGLE_API_KEY

class QueryTransformer:
    def __init__(self, model="gemini-2.5-flash", temperature=0.1):
        # Optimized prompt for Database Search (Retrieval)
        self.transform_prompt = ChatPromptTemplate.from_template("""
            Bạn là một AI chuyên phân tích và tối ưu hóa câu hỏi để tìm kiếm trong cơ sở dữ liệu.
            Nhiệm vụ của bạn là làm rõ câu hỏi của người dùng dựa trên lịch sử hội thoại.
            
            Quy tắc BẮT BUỘC:
            1. Sửa lỗi chính tả, viết tắt (VD: "ko" -> "không", "wfh" -> "làm việc từ xa").
            2. XỬ LÝ ĐẠI TỪ: NẾU câu hỏi dùng đại từ (anh ấy, nó, chính sách đó), BẮT BUỘC phải tìm trong Lịch sử hội thoại để thay thế bằng danh từ cụ thể.
            (VD Lịch sử: "Trưởng nhóm là Quang" -> Câu hỏi: "Email của anh ấy?" => Kết quả: "Email của Quang là gì?").
            3. TÁCH CÂU: NẾU câu hỏi chứa nhiều ý (chứa từ "và", "gồm"), BẮT BUỘC phải tách thành các câu đơn và ngăn cách bằng dấu "|".
            (VD: "Chính sách nghỉ phép và WFH" -> "Chính sách nghỉ phép?|Chính sách WFH?").
            4. TỐI ƯU NGÔN NGỮ TÌM KIẾM: Nếu câu hỏi KHÔNG phải là tiếng Việt, hãy DỊCH NÓ SANG TIẾNG VIỆT để hệ thống dễ dàng tìm kiếm tài liệu (vì tài liệu gốc lưu bằng tiếng Việt).
            5. Nếu câu hỏi đã rõ ràng và chỉ có 1 ý, giữ nguyên ý chính.

            Chỉ trả về kết quả theo định dạng sau, không giải thích gì thêm:
            Kết quả: <câu hỏi 1>|<câu hỏi 2>

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