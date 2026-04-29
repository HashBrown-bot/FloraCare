import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const identifyPlant = async (base64Image: string, lang: "en" | "zh" = "en") => {
  const model = "gemini-3.1-pro-preview";
  const prompt = lang === "zh" 
    ? `
    从图片中识别这种植物。以结构化格式提供以下信息：
    1. 常用名称
    2. 学名
    3. 植物类型（例如：多肉植物、室内观叶植物、开花植物等）
    4. 养护说明：
       - 光照要求
       - 浇水频率
       - 土壤类型
       - 温度范围
       - 湿度需求
    5. 有趣的事实或有趣的细节。
    
    使用 Markdown 清晰地格式化响应。请使用中文回答。
    `
    : `
    Identify this plant from the image. Provide the following information in a structured format:
    1. Common Name
    2. Scientific Name
    3. Plant Type (e.g., Succulent, Indoor Foliage, Flowering, etc.)
    4. Care Instructions:
       - Light requirements
       - Watering frequency
       - Soil type
       - Temperature range
       - Humidity needs
    5. Fun Fact or interesting detail.
    
    Format the response clearly using Markdown. Please answer in English.
    `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
        { text: prompt }
      ]
    }
  });

  return response.text;
};

export const chatWithAssistant = async (history: { role: string; parts: { text: string }[] }[], message: string, lang: "en" | "zh" = "en") => {
  const model = "gemini-3-flash-preview";
  const systemInstruction = lang === "zh"
    ? "你是一位名叫 Flora 的专家园艺助手。你乐于助人、友好且博学。你提供关于植物护理、害虫控制和园艺技术的实用建议。回答要简洁但信息丰富。请使用中文回答。"
    : "You are Flora, an expert gardening assistant. You are helpful, friendly, and knowledgeable about all things plants. You provide practical advice on plant care, pest control, and gardening techniques. Keep your answers concise but informative. Please answer in English.";

  const chat = ai.chats.create({
    model,
    config: {
      systemInstruction,
    },
    history,
  });

  const response = await chat.sendMessage({ message });
  return response.text;
};
