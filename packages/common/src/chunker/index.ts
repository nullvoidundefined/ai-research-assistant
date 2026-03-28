export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunk(text: string, maxTokens = 500, overlap = 50): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para);
    const currentTokens = estimateTokens(current);

    if (paraTokens > maxTokens) {
      if (current) {
        chunks.push(current.trim());
        current = '';
      }
      const sentences = para.split(/(?<=[.!?])\s+/);
      let senChunk = '';
      for (const sentence of sentences) {
        if (estimateTokens(senChunk + sentence) > maxTokens && senChunk) {
          chunks.push(senChunk.trim());
          const words = senChunk.split(' ');
          senChunk = words.slice(-overlap).join(' ') + ' ' + sentence;
        } else {
          senChunk += (senChunk ? ' ' : '') + sentence;
        }
      }
      if (senChunk) current = senChunk;
    } else if (currentTokens + paraTokens > maxTokens) {
      if (current) {
        chunks.push(current.trim());
      }
      const prevWords = current.split(' ');
      current = prevWords.slice(-overlap).join(' ') + '\n\n' + para;
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 0);
}
