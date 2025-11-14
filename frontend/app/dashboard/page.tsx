"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Upload, FileText, MessageSquare, LogOut, Send, Loader2, User, Bot } from "lucide-react";

// Type definition for a message
type Message = {
  role: "user" | "ai";
  content: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  
  // --- CHAT STATE ---
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hello! I'm ready. Upload a file to start, then ask me anything." }
  ]);
  const [query, setQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // --- UPLOAD STATE ---
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. PROTECT ROUTE & FETCH DATA ---
  const fetchDocuments = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("http://localhost:5001/api/documents", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setDocuments(data);
    } catch (err) {
      console.error("Failed to fetch docs", err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token) router.push("/login");
    else if (userData) {
      setUser(JSON.parse(userData));
      fetchDocuments();
    }
  }, [router]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // --- 2. HANDLE CHAT ---
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || isTyping) return;

    const token = localStorage.getItem("token");
    const currentQuery = query;
    
    // 1. Add User Message immediately
    setMessages(prev => [...prev, { role: "user", content: currentQuery }]);
    setQuery("");
    setIsTyping(true);

    try {
      // 2. Send to Backend
      const res = await fetch("http://localhost:5001/api/documents/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ query: currentQuery }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      // 3. Add AI Response
      setMessages(prev => [...prev, { role: "ai", content: data.answer }]);

    } catch (error: any) {
      setMessages(prev => [...prev, { role: "ai", content: "Sorry, I encountered an error." }]);
    } finally {
      setIsTyping(false);
    }
  };

  // --- 3. HANDLE UPLOAD ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("token");
      
      const res = await fetch("http://localhost:5001/api/documents/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      alert("Upload Successful!");
      fetchDocuments();
    } catch (error: any) {
      alert("Upload failed: " + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!user) return null;

  return (
    <main className="flex h-screen bg-[#0a0a14] text-white overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-80 border-r border-white/10 bg-white/5 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            MemoryVault
          </h2>
          <p className="text-xs text-gray-500 mt-1">v1.0.0 • {user.email}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
            Your Documents ({documents.length})
          </div>
          {documents.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">No documents yet.</div>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="p-3 rounded-lg bg-white/5 border border-white/5 hover:border-blue-500/50 transition-colors cursor-pointer flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-500/20 text-blue-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate text-gray-200">{doc.file_name}</p>
                  <p className="text-xs text-gray-500">{new Date(doc.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-white/10 bg-black/20">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".pdf,.txt,.md" />
          <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center justify-center gap-2 font-medium transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50">
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isUploading ? "Uploading..." : "Upload New PDF"}
          </button>
        </div>
      </aside>

      {/* CHAT AREA */}
      <section className="flex-1 flex flex-col bg-gradient-to-br from-[#0a0a14] to-[#1a1a2e]">
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-2 text-gray-400">
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm">Chat Mode</span>
          </div>
          <button onClick={() => { localStorage.clear(); router.push("/login"); }} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Messages List */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {messages.map((msg, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "ai" ? "bg-purple-600" : "bg-blue-600"}`}>
                {msg.role === "ai" ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div className={`p-4 rounded-2xl max-w-[80%] ${msg.role === "ai" ? "bg-white/5 border border-white/10 rounded-tl-none" : "bg-blue-600/20 border border-blue-500/20 rounded-tr-none text-blue-100"}`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </motion.div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 pt-0">
          <form onSubmit={handleSendMessage} className="relative">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-6 pr-14 text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
              disabled={isTyping}
            />
            <button 
              type="submit"
              disabled={!query.trim() || isTyping}
              className="absolute right-2 top-2 p-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}