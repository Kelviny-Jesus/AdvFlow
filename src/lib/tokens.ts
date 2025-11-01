import { encoding_for_model, TiktokenModel } from "tiktoken";

interface ChatMessage {
  role: string;
  content: string;
}

export function countChatTokens(
  model: string,
  messages: ChatMessage[]
): number {
  try {
    const enc = encoding_for_model(model as TiktokenModel);
    let tokens = 0;

    for (const message of messages) {
      tokens += 4;
      tokens += enc.encode(message.content || "").length;
    }

    tokens += 2;

    enc.free();

    return tokens;
  } catch (error) {
    console.warn(`Failed to count tokens for model ${model}, using fallback estimation`);
    let totalChars = 0;
    for (const message of messages) {
      totalChars += (message.content || "").length;
    }
    return Math.ceil(totalChars / 4) + messages.length * 4 + 2;
  }
}

export function estimateTokensFromText(text: string): number {
  return Math.ceil(text.length / 4);
}
