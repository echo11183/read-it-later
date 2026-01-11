
// Use the official @google/genai SDK for metadata extraction
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Extracts metadata for a given URL using Gemini API.
 * Uses gemini-3-flash-preview for efficient summarization and extraction.
 */
export const getLinkMetadata = async (url: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Query gemini-3-flash-preview to guess/extract site metadata based on the URL
    // Since browser CORS limits direct fetching, we rely on the model's knowledge
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this URL: ${url}. Provide a professional title, a brief description, and a 1-sentence summary of what this website likely contains.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Professional page title" },
            description: { type: Type.STRING, description: "Brief description of the site source" },
            summary: { type: Type.STRING, description: "A concise 1-sentence summary" }
          },
          required: ["title", "description", "summary"]
        }
      }
    });

    const text = response.text || "{}";
    const metadata = JSON.parse(text);
    
    return {
      title: metadata.title || "New Link",
      description: metadata.description || `Source: ${new URL(url).hostname}`,
      summary: metadata.summary || "No summary provided."
    };
  } catch (error) {
    console.error("Gemini metadata extraction failed:", error);
    // Fallback logic for when AI or network fails
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      let title = domain;
      const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);
      
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1]
          .replace(/-/g, ' ')
          .replace(/_/g, ' ')
          .split('.')[0];
        
        if (lastPart.length > 2) {
          title = lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
        }
      } else {
        title = domain.charAt(0).toUpperCase() + domain.slice(1);
      }

      return {
        title: title,
        description: `Source: ${domain}`,
        summary: "Metadata generated without AI."
      };
    } catch (e) {
      return {
        title: "Unknown Website",
        description: url,
        summary: "Could not parse metadata."
      };
    }
  }
};
