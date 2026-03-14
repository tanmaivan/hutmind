import { useState, useEffect, useRef } from "react";
import { FaUser, FaRobot, FaPaperPlane, FaCircle, FaPlus, FaPizzaSlice, FaInfoCircle, FaTimes, FaFilePdf, FaFileWord, FaDatabase, FaGlobe, FaSun, FaMoon } from "react-icons/fa";
import { MdOutlineContentCopy, MdCheck } from "react-icons/md";
import ReactMarkdown from "react-markdown";
import "./ChatBot.css";

const BASE_URL = "https://tanmaivan-hutmind.hf.space";

const TRANSLATIONS = {
  vi: {
    newChat: "Trò chuyện mới",
    welcomeTitle: "Tôi có thể giúp gì cho bạn?",
    welcomeSubtitle: "Hãy hỏi tôi về chính sách JRG, thông tin hệ thống Pizza Hut VN hoặc về Data Analytics Team.",
    knowledgeBaseBtn: "Dữ liệu thông tin",
    suggestion1: "Giới thiệu về team data analytics, ban quản lý là ai?",
    suggestion1Chip: "Giới thiệu Data Analytics",
    suggestion2: "Kể cho tôi nghe lịch sử hình thành của Pizza Hut!",
    suggestion2Chip: "Lịch sử Pizza Hut",
    suggestion3: "Data Analytics Team có ai làm việc ở nước ngoài không?",
    suggestion3Chip: "Data Analytics nước ngoài",
    suggestion4: "Tập đoàn JRG đang quản lý thương hiệu Pizza Hut ở những nước nào?",
    suggestion4Chip: "Quy mô JRG toàn cầu",
    inputPlaceholder: "Gửi tin nhắn cho HutMind...",
    footerDisclaimer: "HutMind có thể mắc lỗi. Vui lòng kiểm tra lại các thông tin quan trọng.",
    modalTitle: "Dữ liệu tham khảo",
    modalDescription: "Dưới đây là các tài liệu và nguồn dữ liệu hiện đang được HutMind sử dụng để trả lời câu hỏi của bạn:",
    errorConnection: "Đã xảy ra lỗi khi kết nối với chatbot. Vui lòng thử lại sau.",
    errorInit: "Lỗi khi khởi tạo lại chatbot",
    copyTooltip: "Sao chép",
    themeLight: "Chế độ sáng",
    themeDark: "Chế độ tối",
    sources: [
      { name: "Thông tin về Data Analytics Team (JRGVN)", type: "database" },
      { name: "Hướng dẫn Chính sách Bảo mật Thông tin (2024)", type: "pdf" },
      { name: "Quy định Nghỉ phép và Nghỉ bệnh (PSL)", type: "pdf" },
      { name: "Chính sách Công tác và Tiếp khách nước ngoài (2025)", type: "pdf" },
      { name: "Chính sách Bảo mật Dữ liệu PHV (2023)", type: "word" },
      { name: "Chỉ thị Ứng phó Sự cố CNTT (DRP)", type: "pdf" },
      { name: "Danh mục từ viết tắt và Thuật ngữ chuyên môn", type: "word" },
      { name: "Quy trình và Chính sách Phần mềm", type: "pdf" },
    ]
  },
  en: {
    newChat: "New Chat",
    welcomeTitle: "How can I help you today?",
    welcomeSubtitle: "Ask me about JRG policies, Pizza Hut VN systems, or the Data Analytics Team.",
    knowledgeBaseBtn: "Knowledge Base",
    suggestion1: "Intro to Data Analytics Team, who's the management?",
    suggestion1Chip: "Data Analytics Intro",
    suggestion2: "Tell me about the history of Pizza Hut!",
    suggestion2Chip: "Pizza Hut History",
    suggestion3: "Does anyone in the Data Analytics Team work overseas?",
    suggestion3Chip: "Overseas Data Analytics Team",
    suggestion4: "Which countries does JRG manage the Pizza Hut brand in?",
    suggestion4Chip: "JRG Global Scale",
    inputPlaceholder: "Message HutMind...",
    footerDisclaimer: "HutMind can make mistakes. Check important info.",
    modalTitle: "Reference Data",
    modalDescription: "Below are the documents and data sources currently being used by HutMind to answer your questions:",
    errorConnection: "An error occurred connecting to the chatbot. Please try again later.",
    errorInit: "Error re-initializing chatbot",
    copyTooltip: "Copy",
    themeLight: "Light mode",
    themeDark: "Dark mode",
    sources: [
      { name: "Data Analytics Team Info (JRGVN)", type: "database" },
      { name: "Info Security Policy Guidelines (2024)", type: "pdf" },
      { name: "Leave & Sick Leave Regulations (PSL)", type: "pdf" },
      { name: "Overseas Travel & Entertainment Policy (2025)", type: "pdf" },
      { name: "PHV Data Privacy Policy (2023)", type: "word" },
      { name: "IT Disaster Recovery Directive (DRP)", type: "pdf" },
      { name: "Abbreviations & Technical Terms", type: "word" },
      { name: "Software Policy & Procedure", type: "pdf" },
    ]
  }
};

const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem("hutmind-lang") || "vi");
  const [theme, setTheme] = useState(() => localStorage.getItem("hutmind-theme") || "light");
  const chatWindowRef = useRef(null);
  const textareaRef = useRef(null);

  const t = (key) => TRANSLATIONS[language][key];

  // Persist settings
  useEffect(() => {
    localStorage.setItem("hutmind-lang", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("hutmind-theme", theme);
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [theme]);

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
        throw new Error(t("errorConnection"));
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
        { sender: "bot", text: t("errorConnection") }, 
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
        throw new Error(t("errorInit"));
      }

      const data = await response.json();
      console.log(data.message); 
    } catch (error) {
      console.error("Lỗi:", error);
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const getSourceIcon = (type) => {
    switch (type) {
      case "pdf": return <FaFilePdf className="source-icon pdf" />;
      case "word": return <FaFileWord className="source-icon word" />;
      case "database": return <FaDatabase className="source-icon db" />;
      default: return <FaInfoCircle className="source-icon" />;
    }
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === "vi" ? "en" : "vi");
  };

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  return (
    <div className={`chatbot-container ${theme}`}>
      <div className="chat-header">
        <div className="header-left">
          <div className="header-logo" onClick={handleNewChat} title="HutMind">
            <img 
              src={theme === 'light' ? "/logo_light.png" : "/logo_dark.png"} 
              alt="Logo" 
              width={50} 
              height={50} 
            />
            <div className="header-title">
              <h1>HutMind</h1>
            </div>
          </div>
        </div>

        <div className="header-right">
          <button className="theme-switcher" onClick={toggleTheme} title={theme === 'light' ? t("themeDark") : t("themeLight")}>
            {theme === 'light' ? <FaMoon size={16} /> : <FaSun size={16} />}
          </button>
          
          <button className="lang-switcher" onClick={toggleLanguage} title="Switch Language">
            <FaGlobe size={14} />
            <span>{language.toUpperCase()}</span>
          </button>

          <button className="new-chat-btn" onClick={handleNewChat} title={t("newChat")}>
            <FaPlus size={16} />
            <span>{t("newChat")}</span>
          </button>
        </div>
      </div>

      <div className="chat-window" ref={chatWindowRef}>
        {messages.length === 0 && (
          <div className="welcome-container">
            <div className="welcome-logo">
              <img src="/mascot.png" alt="Mascot" width={200} height={250} />
            </div>
            <h2>{t("welcomeTitle")}</h2>
            <p className="welcome-subtitle">{t("welcomeSubtitle")}</p>
            
            <button className="knowledge-base-btn" onClick={() => setShowKnowledgeModal(true)}>
              <FaInfoCircle size={14} />
              <span>{t("knowledgeBaseBtn")}</span>
            </button>

            <div className="suggestion-chips">
              <button onClick={() => setUserInput(t("suggestion1"))}>
                {t("suggestion1Chip")}
              </button>
              
              <button onClick={() => setUserInput(t("suggestion2"))}>
                {t("suggestion2Chip")}
              </button>
              
              <button onClick={() => setUserInput(t("suggestion3"))}>
                {t("suggestion3Chip")}
              </button>
              
              <button onClick={() => setUserInput(t("suggestion4"))}>
                {t("suggestion4Chip")}
              </button>
            </div>
          </div>
        )}

        <div className="messages-list">
          {messages.map((message, index) => {
            const lastBotIndex = [...messages].reverse().findIndex(m => m.sender === 'bot');
            const actualLastBotIndex = lastBotIndex !== -1 ? messages.length - 1 - lastBotIndex : -1;
            const isLatestBotMessage = index === actualLastBotIndex;

            return (
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
                    <div className={`bot-message-wrapper ${isLatestBotMessage ? 'latest' : ''}`}>
                      <div className="markdown-body">
                        <ReactMarkdown>{message.text}</ReactMarkdown>
                      </div>
                      {message.text !== "..." && (
                        <button 
                          className="copy-btn" 
                          onClick={() => copyToClipboard(message.text, index)}
                          title={t("copyTooltip")}
                        >
                          {copiedIndex === index ? <MdCheck size={18} /> : <MdOutlineContentCopy size={18} />}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="user-text">{message.text}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="input-area">
        <div className="input-container">
          <textarea
            ref={textareaRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={t("inputPlaceholder")}
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
        <div className="footer-text">{t("footerDisclaimer")}</div>
      </div>

      {showKnowledgeModal && (
        <div className="modal-overlay" onClick={() => setShowKnowledgeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t("modalTitle")}</h3>
              <button className="close-modal" onClick={() => setShowKnowledgeModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-description">{t("modalDescription")}</p>
              <div className="sources-list">
                {t("sources").map((source, idx) => (
                  <div key={idx} className="source-item">
                    {getSourceIcon(source.type)}
                    <span className="source-name">{source.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;