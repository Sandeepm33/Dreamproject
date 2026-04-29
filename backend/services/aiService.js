const Groq = require("groq-sdk");
const dotenv = require("dotenv");
dotenv.config();

const getGroq = () => {
  const key = process.env.GROQ_API_KEY;
  if (!key || key === 'your_groq_api_key_here') {
    console.error("❌ GROQ_API_KEY is missing or using placeholder in .env.");
    return null;
  }
  const maskedKey = `${key.substring(0, 5)}...${key.substring(key.length - 4)}`;
  console.log(`✅ Groq AI Initialized with Key: ${maskedKey}`);
  return new Groq({ apiKey: key });
};

const SYSTEM_PROMPT = `You are 'Panchayat Sahayak', a helpful AI assistant for a Gram Panchayat office in Andhra Pradesh and Telangana.

STRICT LANGUAGE RULES:
1. Use ONLY English or Telugu.
2. NEVER use Hindi. Even if the user asks in Hindi, you must reply in English or Telugu.
3. If the user writes in English, reply in English.
4. If the user writes in Telugu, reply in Telugu.

Your goal is to help citizens with government schemes, complaint filing, and general information about the village administration. Be polite, concise, and professional.`;

/**
 * Translates text to a target language.
 */
exports.translateText = async (text, targetLanguage = "English") => {
  try {
    const groq = getGroq();
    if (!groq) throw new Error("Groq not initialized");

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a professional translator." },
        { role: "user", content: `Translate the following text to ${targetLanguage}. Return ONLY the translated text without any explanations or quotes:\n\n${text}` }
      ],
      temperature: 0.3,
    });

    return completion.choices[0]?.message?.content?.trim() || text;
  } catch (error) {
    console.error("AI Translation Error:", error.message);
    return text; // Return original text as fallback
  }
};

/**
 * Summarizes a complaint and extracts key entities.
 */
exports.summarizeComplaint = async (description) => {
  try {
    const groq = getGroq();
    if (!groq) throw new Error("Groq not initialized");

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a helpful assistant that analyzes complaints." },
        { role: "user", content: `Summarize the following complaint into a short title (max 10 words) and extract the core issue. Format as JSON: { "summary": "...", "coreIssue": "...", "urgency": "low/medium/high" }.\n\nComplaint: ${description}` }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const text = completion.choices[0]?.message?.content || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Summary Error:", error.message);
    return null;
  }
};

/**
 * Chat response for Panchayat Sahayak.
 */
exports.getChatResponse = async (history, message) => {
  try {
    const groq = getGroq();
    if (!groq) throw new Error("Groq not initialized");

    // Build messages array — history must start with user messages only
    const messages = [{ role: "system", content: SYSTEM_PROMPT }];

    // Add history (skip leading model messages)
    let seenUser = false;
    for (const h of history) {
      if (h.role === 'user') seenUser = true;
      if (!seenUser) continue;
      messages.push({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.text
      });
    }

    // Add the new user message
    messages.push({ role: "user", content: message });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.7,
      max_tokens: 512,
    });

    return completion.choices[0]?.message?.content || "I'm sorry, I could not generate a response.";
  } catch (error) {
    console.error("❌ AI Chat Error:", error.message);
    return "I'm sorry, I'm having trouble connecting right now. Please try again later or contact the office.";
  }
};

/**
 * Transcribes audio using Groq's Whisper model (Voice-to-Report).
 */
exports.transcribeAudio = async (audioBuffer, mimeType) => {
  try {
    const groq = getGroq();
    if (!groq) throw new Error("Groq not initialized");

    // Groq uses Whisper for transcription via the audio.transcriptions endpoint
    const { toFile } = require("groq-sdk");
    const file = await toFile(audioBuffer, "audio.webm", { type: mimeType });

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: "whisper-large-v3",
      response_format: "json",
      language: "te", // Hint Telugu
    });

    const transcribed = transcription.text || "";

    // If not in English, translate it
    const translation = await exports.translateText(transcribed, "English");

    return { transcription: transcribed, translation };
  } catch (error) {
    console.error("AI Transcription Error:", error.message);
    return null;
  }
};
