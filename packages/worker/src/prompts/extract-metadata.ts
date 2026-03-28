export function buildExtractMetadataPrompt(content: string): string {
  return `Extract metadata from this content and return ONLY valid JSON with these fields:
{
  "title": "string or null",
  "author": "string or null",
  "publishedDate": "ISO date string or null",
  "summary": "2-3 sentence summary"
}

Content:
${content.slice(0, 3000)}`;
}
