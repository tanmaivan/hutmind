import warnings
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from chatbot import ChatBot

# Suppress warnings
warnings.filterwarnings("ignore")

# Initialize FastAPI application
app = FastAPI()

# CORS configuration for Frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ChatBot instance globally
chatbot = ChatBot()

# Request Schema
class QueryRequest(BaseModel):
    query: str

@app.get("/newchat/")
async def new_chat():
    """Endpoint to reset the chat memory and initialize a new chatbot instance."""
    global chatbot
    chatbot = ChatBot()
    return {"message": "ChatBot has been successfully reset."}

@app.post("/process_query_stream/")
async def process_query_stream(request: QueryRequest):
    """Endpoint to process user query and stream the response back."""
    global chatbot
    try:
        raw_query = request.query
        
        # Generator for streaming response
        def generate():
            for chunk in chatbot.process_query_stream(raw_query):
                yield chunk

        return StreamingResponse(generate(), media_type="text/plain")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))