/** What every engine adapter returns: the answer text plus any source URLs the
 *  engine explicitly cited. Engines without grounding (ChatGPT, Gemini via plain
 *  generateContent) return an empty citations array — inline URLs in their text
 *  are still picked up by the scorer. */
export interface LLMReply {
  text: string;
  citations: string[];
}
