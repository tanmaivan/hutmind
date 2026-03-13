import { useState, useEffect, useRef } from "react";
import { FaUser, FaRobot, FaPaperPlane, FaCircle, FaPlus, FaPizzaSlice } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import "./ChatBot.css";

const BASE_URL = "https://tanmaivan-hutmind.hf.space";

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatWindowRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [messages]);

  // Adjust textarea height automatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [userInput]);

  const handleSend = async () => {
    if (userInput.trim() === "" || isLoading) return; 

    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: "user", text: userInput },
      { sender: "bot", text: "..." }, 
    ]);

    setUserInput("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const response = await fetch(`${BASE_URL}/process_query_stream/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: userInput }),
      });

      if (!response.ok) {
        throw new Error("Lỗi khi gửi yêu cầu");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botResponse = "";
      let isFirstChunk = true; 

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        botResponse += chunk;

        if (isFirstChunk) {
          setMessages((prevMessages) => [
            ...prevMessages.filter((msg) => msg.text !== "..."), 
            { sender: "bot", text: botResponse }, 
          ]);
          isFirstChunk = false; 
        } else {
          setMessages((prevMessages) => {
            const newMessages = [...prevMessages];
            const lastMessageIndex = newMessages.length - 1;
            if (newMessages[lastMessageIndex].sender === "bot") {
              newMessages[lastMessageIndex].text = botResponse;
            }
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error("Lỗi:", error);
      setMessages((prevMessages) => [
        ...prevMessages.filter((msg) => msg.text !== "..."),
        { sender: "bot", text: "Đã xảy ra lỗi khi kết nối với chatbot. Vui lòng thử lại sau." }, 
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    setMessages([]); 
    setIsLoading(false); // Reset loading state
    try {
      const response = await fetch(`${BASE_URL}/newchat/`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Lỗi khi khởi tạo lại chatbot");
      }

      const data = await response.json();
      console.log(data.message); 
    } catch (error) {
      console.error("Lỗi:", error);
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chat-header">
        <div className="header-logo" onClick={handleNewChat} title="Quay về trang chủ">
          <img src="/pizzahut.png" alt="Pizza Hut Logo" width={50} height={50} />
          <div className="header-title">
            <h1>HutMind - JRG Chatbot</h1>
            <span>Powered by Tan Mai</span>
          </div>
        </div>
        <button className="new-chat-btn" onClick={handleNewChat} title="Cuộc trò chuyện mới">
          <FaPlus size={16} />
          <span>New Chat</span>
        </button>
      </div>

      <div className="chat-window" ref={chatWindowRef}>
        {messages.length === 0 && (
          <div className="welcome-container">
            <div className="welcome-logo">
              <img src="/mascot.png" alt="Pizza Hut Mascot" width={200} height={250} />
            </div>
            <h2>Tôi có thể giúp gì cho bạn?</h2>
            <p className="welcome-subtitle">
              Hãy hỏi tôi về chính sách JRG, thông tin hệ thống Pizza Hut VN hoặc về Data Team.
            </p>
            <div className="suggestion-chips">
              <button onClick={() => setUserInput("Giới thiệu về team data, ban quản lý là ai?")}>
                Giới thiệu Team Data
              </button>
              
              <button onClick={() => setUserInput("Kể cho tôi nghe lịch sử hình thành của Pizza Hut!")}>
                Lịch sử Pizza Hut
              </button>
              
              <button onClick={() => setUserInput("Team Data có ai làm việc ở nước ngoài không?")}>
                Team Data nước ngoài
              </button>
              
              <button onClick={() => setUserInput("Tập đoàn JRG đang quản lý thương hiệu Pizza Hut ở những nước nào?")}>
                Quy mô JRG toàn cầu
              </button>
            </div>
          </div>
        )}

        <div className="messages-list">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`message-row ${message.sender}`}
            >
              <div className="message-content">
                {message.sender === "bot" && message.text === "..." ? (
                  <div className="typing-indicator">
                    <FaCircle className="dot dot1" />
                    <FaCircle className="dot dot2" />
                    <FaCircle className="dot dot3" />
                  </div>
                ) : message.sender === "bot" ? (
                  <div className="markdown-body">
                    <ReactMarkdown>{message.text}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="user-text">{message.text}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="input-area">
        <div className="input-container">
          <textarea
            ref={textareaRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Gửi tin nhắn cho HutMind..."
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="chat-input"
          />
          <button
            onClick={handleSend}
            disabled={userInput.trim() === "" || isLoading}
            className={`send-button ${userInput.trim() === "" || isLoading ? "disabled" : ""}`}
            title="Gửi"
          >
            <FaPaperPlane size={16} />
          </button>
        </div>
        <div className="footer-text">
          Pizza Hut Assistant có thể mắc lỗi. Vui lòng kiểm tra lại các thông tin quan trọng.
        </div>
      </div>
    </div>
  );
};

export default ChatBot;