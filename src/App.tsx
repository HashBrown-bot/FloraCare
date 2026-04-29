/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Camera, 
  Upload, 
  Leaf, 
  MessageSquare, 
  X, 
  Send, 
  Loader2, 
  Droplets, 
  Sun, 
  Thermometer, 
  Wind,
  Info,
  ChevronRight,
  Sparkles
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { identifyPlant, chatWithAssistant } from "@/src/lib/gemini";
import { cn } from "@/lib/utils";
import { Languages, Bookmark, BookmarkCheck, History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface SavedPlant {
  id: string;
  image: string;
  result: string;
  date: string;
  lang: Language;
}

type Language = "en" | "zh";

const translations = {
  en: {
    title: "FloraCare",
    description: "Your personal botanical expert. Snap a photo to identify any plant and learn how to help it thrive.",
    identifyTitle: "Identify a Plant",
    identifyDesc: "Take a photo or upload an image to start",
    uploadBtn: "Upload Photo",
    reAnalyzeBtn: "Re-analyze Image",
    analyzingTitle: "Analyzing your plant...",
    analyzingDesc: "Consulting our botanical database",
    plantIdentified: "Plant Identified",
    careGuide: "Care Guide",
    light: "Light",
    water: "Water",
    temp: "Temp",
    humidity: "Humidity",
    askFollowUp: "Ask follow-up questions",
    noPlantTitle: "No plant identified yet",
    noPlantDesc: "Upload a photo to see detailed care instructions here.",
    chatTitle: "Flora Assistant",
    chatStatus: "Always online",
    chatWelcome: "Hi! I'm Flora. Ask me anything about your plants, gardening tips, or pest control.",
    chatPlaceholder: "Ask Flora a question...",
    footer: "FloraCare Assistant • Powered by Gemini AI",
    errorIdentify: "Could not identify the plant. Please try another photo.",
    errorGeneral: "An error occurred. Please try again.",
    errorChat: "Sorry, I'm having trouble connecting right now.",
    assistantError: "I'm sorry, I couldn't process that.",
    saveBtn: "Save to Collection",
    savedBtn: "Saved",
    collectionTitle: "My Collection",
    collectionDesc: "Your previously identified plants",
    emptyCollection: "Your collection is empty",
    deleteBtn: "Delete",
    nextPlantBtn: "Identify Next Plant",
    saveSuccess: "Plant saved to your collection!",
    deleteSuccess: "Plant removed from collection"
  },
  zh: {
    title: "植护助手",
    description: "您的私人植物专家。拍照即可识别任何植物，并学习如何让它茁壮成长。",
    identifyTitle: "识别植物",
    identifyDesc: "拍照或上传图片以开始",
    uploadBtn: "上传照片",
    reAnalyzeBtn: "重新分析图片",
    analyzingTitle: "正在分析您的植物...",
    analyzingDesc: "正在咨询我们的植物数据库",
    plantIdentified: "植物已识别",
    careGuide: "养护指南",
    light: "光照",
    water: "水分",
    temp: "温度",
    humidity: "湿度",
    askFollowUp: "提出后续问题",
    noPlantTitle: "尚未识别植物",
    noPlantDesc: "上传照片即可在此处查看详细的养护说明。",
    chatTitle: "Flora 助手",
    chatStatus: "始终在线",
    chatWelcome: "你好！我是 Flora。你可以问我任何关于植物护理、园艺技巧或害虫控制的问题。",
    chatPlaceholder: "向 Flora 提问...",
    footer: "植护助手 • 由 Gemini AI 提供支持",
    errorIdentify: "无法识别该植物。请尝试另一张照片。",
    errorGeneral: "发生错误。请重试。",
    errorChat: "抱歉，我现在连接出现问题。",
    assistantError: "对不起，我无法处理该请求。",
    saveBtn: "保存到收藏",
    savedBtn: "已保存",
    collectionTitle: "我的收藏",
    collectionDesc: "您之前识别过的植物",
    emptyCollection: "您的收藏夹是空的",
    deleteBtn: "删除",
    nextPlantBtn: "识别下一个植物",
    saveSuccess: "植物已保存到您的收藏！",
    deleteSuccess: "植物已从收藏中移除"
  }
};

export default function App() {
  const [lang, setLang] = useState<Language>("en");
  const t = translations[lang];

  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [collection, setCollection] = useState<SavedPlant[]>([]);
  const [isCollectionOpen, setIsCollectionOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Load collection from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("flora_collection");
    if (saved) {
      try {
        setCollection(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse collection", e);
      }
    }
  }, []);

  // Save collection to localStorage
  useEffect(() => {
    localStorage.setItem("flora_collection", JSON.stringify(collection));
  }, [collection]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImage(base64String);
        analyzeImage(base64String.split(",")[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await identifyPlant(base64, lang);
      setAnalysisResult(result || t.errorIdentify);
    } catch (error) {
      console.error("Analysis failed:", error);
      setAnalysisResult(t.errorGeneral);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isChatLoading) return;

    const userMsg = inputMessage;
    setInputMessage("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsChatLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }));
      
      const response = await chatWithAssistant(history, userMsg, lang);
      setMessages(prev => [...prev, { role: "assistant", content: response || t.assistantError }]);
    } catch (error) {
      console.error("Chat failed:", error);
      setMessages(prev => [...prev, { role: "assistant", content: t.errorChat }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const saveToCollection = () => {
    if (!image || !analysisResult) return;
    
    const newEntry: SavedPlant = {
      id: Date.now().toString(),
      image,
      result: analysisResult,
      date: new Date().toLocaleDateString(),
      lang
    };
    
    setCollection(prev => [newEntry, ...prev]);
    toast.success(t.saveSuccess);
  };

  const deleteFromCollection = (id: string) => {
    setCollection(prev => prev.filter(item => item.id !== id));
    toast.info(t.deleteSuccess);
  };

  const isAlreadySaved = analysisResult && collection.some(item => item.result === analysisResult);

  const resetForNext = () => {
    setImage(null);
    setAnalysisResult(null);
    setMessages([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 max-w-6xl mx-auto relative pb-32">
      {/* Top Controls */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-10 flex gap-2">
        <Dialog open={isCollectionOpen} onOpenChange={setIsCollectionOpen}>
          <DialogTrigger render={
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full bg-white/80 backdrop-blur-sm border-brand-200 text-brand-700 hover:bg-brand-50"
            >
              <History size={16} className="mr-2" />
              {t.collectionTitle}
            </Button>
          } />
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-3xl font-serif">{t.collectionTitle}</DialogTitle>
              <DialogDescription>{t.collectionDesc}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 mt-4 pr-4">
              {collection.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                  <Bookmark size={48} className="mx-auto mb-4" />
                  <p>{t.emptyCollection}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                  {collection.map((item) => (
                    <Card key={item.id} className="overflow-hidden border-none shadow-md rounded-2xl group">
                      <div className="aspect-video relative">
                        <img src={item.image} alt="Saved plant" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="rounded-full"
                            onClick={() => {
                              setImage(item.image);
                              setAnalysisResult(item.result);
                              setLang(item.lang);
                              setIsCollectionOpen(false);
                            }}
                          >
                            View Details
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            className="rounded-full"
                            onClick={() => deleteFromCollection(item.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-brand-400 font-medium">{item.date}</span>
                          <Badge variant="outline" className="text-[10px] uppercase">{item.lang}</Badge>
                        </div>
                        <div className="line-clamp-2 text-sm text-brand-700 prose prose-sm">
                          <ReactMarkdown>{item.result.split('\n')[0]}</ReactMarkdown>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-full bg-white/80 backdrop-blur-sm border-brand-200 text-brand-700 hover:bg-brand-50"
          onClick={() => setLang(lang === "en" ? "zh" : "en")}
        >
          <Languages size={16} className="mr-2" />
          {lang === "en" ? "中文" : "English"}
        </Button>
      </div>

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full flex flex-col items-center mb-12 text-center"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-brand-700 rounded-full text-white shadow-lg">
            <Leaf size={32} />
          </div>
          <h1 className="text-4xl md:text-6xl text-brand-900">{t.title}</h1>
        </div>
        <p className="text-lg text-brand-600 max-w-2xl font-sans">
          {t.description}
        </p>
      </motion.header>

      <main className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Upload Section */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-none shadow-xl bg-white overflow-hidden rounded-3xl">
            <CardContent className="p-0">
              <div 
                className={cn(
                  "aspect-square relative flex flex-col items-center justify-center border-4 border-dashed border-brand-200 m-4 rounded-2xl transition-all",
                  !image && "hover:border-brand-400 hover:bg-brand-50 cursor-pointer"
                )}
                onClick={() => !image && fileInputRef.current?.click()}
              >
                {image ? (
                  <>
                    <img 
                      src={image} 
                      alt="Uploaded plant" 
                      className="w-full h-full object-cover rounded-xl"
                      referrerPolicy="no-referrer"
                    />
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="absolute top-2 right-2 rounded-full shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImage(null);
                        setAnalysisResult(null);
                      }}
                    >
                      <X size={18} />
                    </Button>
                  </>
                ) : (
                  <div className="text-center p-8">
                    <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-600">
                      <Camera size={40} />
                    </div>
                    <h3 className="text-xl font-serif mb-2">{t.identifyTitle}</h3>
                    <p className="text-brand-500 text-sm mb-6">{t.identifyDesc}</p>
                    <Button className="bg-brand-700 hover:bg-brand-800 rounded-full px-8">
                      <Upload className="mr-2 h-4 w-4" /> {t.uploadBtn}
                    </Button>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                />
              </div>
            </CardContent>
          </Card>

          {image && !isAnalyzing && !analysisResult && (
            <Button 
              className="w-full bg-brand-700 hover:bg-brand-800 py-6 text-lg rounded-2xl shadow-lg"
              onClick={() => analyzeImage(image.split(",")[1])}
            >
              <Sparkles className="mr-2 h-5 w-5" /> {t.reAnalyzeBtn}
            </Button>
          )}
        </div>

        {/* Results Section */}
        <div className="lg:col-span-7 space-y-6">
          <AnimatePresence mode="wait">
            {isAnalyzing ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <Card className="border-none shadow-xl bg-white rounded-3xl p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                    <div>
                      <h3 className="text-2xl font-serif">{t.analyzingTitle}</h3>
                      <p className="text-brand-500">{t.analyzingDesc}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full bg-brand-100" />
                    <Skeleton className="h-4 w-[90%] bg-brand-100" />
                    <Skeleton className="h-4 w-[95%] bg-brand-100" />
                    <div className="grid grid-cols-2 gap-4 mt-8">
                      <Skeleton className="h-24 rounded-2xl bg-brand-100" />
                      <Skeleton className="h-24 rounded-2xl bg-brand-100" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ) : analysisResult ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
                  <CardHeader className="bg-brand-700 text-white p-8">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge className="bg-brand-500 text-white border-none mb-2 px-3 py-1">{t.plantIdentified}</Badge>
                        <CardTitle className="text-4xl md:text-5xl font-serif">{t.careGuide}</CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="rounded-full bg-white/20 hover:bg-white/30 text-white border-none"
                          onClick={saveToCollection}
                          disabled={isAlreadySaved || false}
                        >
                          {isAlreadySaved ? <BookmarkCheck className="mr-2 h-4 w-4" /> : <Bookmark className="mr-2 h-4 w-4" />}
                          {isAlreadySaved ? t.savedBtn : t.saveBtn}
                        </Button>
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                          <Info size={24} />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="prose prose-brand max-w-none prose-headings:font-serif prose-p:text-brand-700 prose-li:text-brand-700">
                      <ReactMarkdown>{analysisResult}</ReactMarkdown>
                    </div>
                    
                    <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-brand-50 p-4 rounded-2xl flex flex-col items-center text-center">
                        <Sun className="text-brand-600 mb-2" size={24} />
                        <span className="text-xs uppercase tracking-wider font-semibold text-brand-400">{t.light}</span>
                      </div>
                      <div className="bg-brand-50 p-4 rounded-2xl flex flex-col items-center text-center">
                        <Droplets className="text-brand-600 mb-2" size={24} />
                        <span className="text-xs uppercase tracking-wider font-semibold text-brand-400">{t.water}</span>
                      </div>
                      <div className="bg-brand-50 p-4 rounded-2xl flex flex-col items-center text-center">
                        <Thermometer className="text-brand-600 mb-2" size={24} />
                        <span className="text-xs uppercase tracking-wider font-semibold text-brand-400">{t.temp}</span>
                      </div>
                      <div className="bg-brand-50 p-4 rounded-2xl flex flex-col items-center text-center">
                        <Wind className="text-brand-600 mb-2" size={24} />
                        <span className="text-xs uppercase tracking-wider font-semibold text-brand-400">{t.humidity}</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full mt-8 bg-brand-100 text-brand-700 hover:bg-brand-200 py-6 rounded-2xl font-semibold"
                      onClick={() => setIsChatOpen(true)}
                    >
                      {t.askFollowUp} <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-brand-200 rounded-3xl opacity-50"
              >
                <Leaf size={64} className="text-brand-300 mb-4" />
                <h3 className="text-2xl font-serif text-brand-400">{t.noPlantTitle}</h3>
                <p className="text-brand-400">{t.noPlantDesc}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Center Button */}
      {analysisResult && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40"
        >
          <Button 
            className="bg-brand-900 hover:bg-black text-white px-8 py-6 rounded-full shadow-2xl flex items-center gap-2 border-4 border-white"
            onClick={resetForNext}
          >
            <Camera size={20} />
            {t.nextPlantBtn}
          </Button>
        </motion.div>
      )}

      {/* Chat Interface */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-20 right-0 w-[90vw] md:w-[400px] h-[500px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-brand-100"
            >
              <div className="bg-brand-700 p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold">{t.chatTitle}</h4>
                    <span className="text-[10px] uppercase tracking-widest opacity-70">{t.chatStatus}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full" onClick={() => setIsChatOpen(false)}>
                  <X size={20} />
                </Button>
              </div>

              <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 bg-brand-50/30">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-8 px-4">
                      <p className="text-brand-500 text-sm">
                        {t.chatWelcome}
                      </p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div 
                        className={cn(
                          "max-w-[80%] p-3 rounded-2xl text-sm shadow-sm",
                          msg.role === "user" 
                            ? "bg-brand-700 text-white rounded-tr-none" 
                            : "bg-white text-brand-900 border border-brand-100 rounded-tl-none"
                        )}
                      >
                        <div className="prose prose-sm prose-brand prose-invert max-w-none">
                          <ReactMarkdown>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-brand-100 shadow-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="p-4 bg-white border-t border-brand-100">
                <form 
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                >
                  <Input 
                    placeholder={t.chatPlaceholder} 
                    className="rounded-full bg-brand-50 border-none focus-visible:ring-brand-700"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    className="rounded-full bg-brand-700 hover:bg-brand-800 shrink-0"
                    disabled={!inputMessage.trim() || isChatLoading}
                  >
                    <Send size={18} />
                  </Button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button 
          size="icon" 
          className={cn(
            "w-14 h-14 rounded-full shadow-2xl transition-all duration-300",
            isChatOpen ? "bg-brand-900 rotate-90" : "bg-brand-700 hover:bg-brand-800"
          )}
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          {isChatOpen ? <X size={28} /> : <MessageSquare size={28} />}
        </Button>
      </div>

      {/* Footer */}
      <footer className="mt-20 py-8 border-t border-brand-200 w-full text-center text-brand-400 text-sm font-sans">
        <p>© {new Date().getFullYear()} {t.footer}</p>
      </footer>
    </div>
  );
}
