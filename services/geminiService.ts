import { GoogleGenAI } from "@google/genai";
import { Terminal, StateSummary } from "../types";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Safely initialize client only when used to avoid init errors if key is missing during render
const getClient = () => {
  if (!GEMINI_API_KEY) return null;
  return new GoogleGenAI({ apiKey: GEMINI_API_KEY });
};

export const generateStrategicReport = async (
  stats: StateSummary[], 
  topTerminal: Terminal | undefined, 
  totalVolume: number,
  totalProfit: number,
  period: string
): Promise<string> => {
  const ai = getClient();
  if (!ai) return "API Key not configured. Unable to generate AI report.";

  const prompt = `
    Act as a Chief Financial Officer for a Bitcoin ATM Network. Analyze the following operational data for the specific period: ${period}.
    Provide a concise strategic summary (max 200 words).
    
    Data Snapshot (${period}):
    - Total Network Volume: $${totalVolume.toLocaleString()}
    - Total Gross Profit: $${totalProfit.toLocaleString()}
    - Top Performing Terminal SN: ${topTerminal?.sn || 'N/A'} (Cash on Hand: $${topTerminal?.cashOnHand.toLocaleString()})
    
    State Performance Breakdown:
    ${stats.map(s => `- ${s.state}: Volume $${s.totalVolume.toLocaleString()}, Active ATMs: ${s.activeTerminals}, Cash Risk: $${s.cashOnHand.toLocaleString()}`).join('\n')}

    Please provide:
    1. An assessment of capital efficiency for this period.
    2. Recommendations for cash logistics based on this specific volume.
    3. Identification of any underperforming regions relative to the allocated cash.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "No analysis could be generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error contacting AI service. Please try again later.";
  }
};