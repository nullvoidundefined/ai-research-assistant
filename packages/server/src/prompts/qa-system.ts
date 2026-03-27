import type { ChunkWithSource } from "@research/common";

export function buildQASystemPrompt(): string {
    return "You are a research assistant helping users explore their knowledge base. Answer questions based on the provided source excerpts. Always cite your sources using [1], [2] notation. Be accurate, concise, and helpful.";
}

export function buildContextBlock(chunks: ChunkWithSource[]): string {
    return chunks.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n");
}
