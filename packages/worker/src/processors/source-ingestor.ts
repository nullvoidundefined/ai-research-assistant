import Anthropic from '@anthropic-ai/sdk';
import { chunk } from '@research/common';
import { query } from 'app/db/pool/pool.js';
import { buildExtractMetadataPrompt } from 'app/prompts/extract-metadata.js';
import { logger } from 'app/utils/logger.js';
import voyageaiPkg from 'voyageai';
import { z } from 'zod';

const { VoyageAIClient } = voyageaiPkg as typeof import('voyageai');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });

const metadataSchema = z.object({
  title: z.string().nullable().optional(),
  author: z.string().nullable().optional(),
  publishedDate: z.string().nullable().optional(),
  summary: z.string(),
});

async function getSourceContent(source: {
  id: string;
  type: string;
  url: string | null;
  r2_key: string | null;
  summary: string | null;
}): Promise<string> {
  if (source.type === 'url') {
    const { extract } = await import('@extractus/article-extractor');
    const article = await extract(source.url!);
    if (!article?.content) throw new Error('Failed to extract article content');
    // Strip HTML tags
    return article.content
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } else if (source.type === 'pdf') {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const pdfParse = await import('pdf-parse');

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    });

    const res = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET ?? 'ai-research-dev',
        Key: source.r2_key!,
      }),
    );
    const buffer = Buffer.from(await res.Body!.transformToByteArray());
    const parsed = await pdfParse.default(buffer);
    return parsed.text;
  } else {
    // note: content is stored in summary field
    return source.summary ?? '';
  }
}

async function extractMetadata(content: string): Promise<{
  title: string | null;
  author: string | null;
  publishedDate: string | null;
  summary: string;
}> {
  const message = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: buildExtractMetadataPrompt(content),
      },
    ],
  });

  const text =
    message.content[0].type === 'text' ? message.content[0].text : '{}';

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch)
    throw new Error('Failed to extract JSON from metadata response');

  const parsed = metadataSchema.parse(JSON.parse(jsonMatch[0]));
  return {
    title: parsed.title ?? null,
    author: parsed.author ?? null,
    publishedDate: parsed.publishedDate ?? null,
    summary: parsed.summary,
  };
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const batchSize = 50;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const result = await voyage.embed({
      input: batch,
      model: 'voyage-3-lite',
      inputType: 'document',
    });
    for (const item of result.data ?? []) {
      allEmbeddings.push(item.embedding);
    }
  }

  return allEmbeddings;
}

export async function processSourceIngest(data: {
  sourceId: string;
  userId: string;
}): Promise<void> {
  const { sourceId, userId } = data;

  logger.info({ sourceId }, 'Starting source ingest');

  // Get source
  const sourceResult = await query('SELECT * FROM sources WHERE id = $1', [
    sourceId,
  ]);
  const source = sourceResult.rows[0] as {
    id: string;
    type: string;
    url: string | null;
    r2_key: string | null;
    summary: string | null;
  };

  if (!source) throw new Error(`Source ${sourceId} not found`);

  // Step 1: Update status to fetching
  await query(
    "UPDATE sources SET status = 'fetching', error = NULL WHERE id = $1",
    [sourceId],
  );

  let content: string;
  try {
    content = await getSourceContent(source);
  } catch (err) {
    logger.error({ err, sourceId }, 'Failed to fetch content');
    await query(
      "UPDATE sources SET status = 'failed', error = $1 WHERE id = $2",
      [
        err instanceof Error ? err.message : 'Failed to fetch content',
        sourceId,
      ],
    );
    return;
  }

  // Step 2: Update status to chunking
  await query("UPDATE sources SET status = 'chunking' WHERE id = $1", [
    sourceId,
  ]);

  // Step 3: Extract metadata
  let metadata: {
    title: string | null;
    author: string | null;
    publishedDate: string | null;
    summary: string;
  };
  try {
    metadata = await extractMetadata(content);
    await query(
      'UPDATE sources SET title = $1, author = $2, published_date = $3, summary = $4 WHERE id = $5',
      [
        metadata.title,
        metadata.author,
        metadata.publishedDate,
        metadata.summary,
        sourceId,
      ],
    );
  } catch (err) {
    logger.warn({ err, sourceId }, 'Metadata extraction failed, continuing');
    metadata = { title: null, author: null, publishedDate: null, summary: '' };
  }

  // Step 4: Chunk text
  const chunks = chunk(content, 500, 50);
  logger.info({ sourceId, chunkCount: chunks.length }, 'Text chunked');

  // Step 5: Update status to embedding
  await query("UPDATE sources SET status = 'embedding' WHERE id = $1", [
    sourceId,
  ]);

  // Step 6: Generate embeddings
  let embeddings: number[][];
  try {
    embeddings = await generateEmbeddings(chunks);
  } catch (err) {
    logger.error({ err, sourceId }, 'Failed to generate embeddings');
    await query(
      "UPDATE sources SET status = 'failed', error = $1 WHERE id = $2",
      [
        err instanceof Error ? err.message : 'Failed to generate embeddings',
        sourceId,
      ],
    );
    return;
  }

  // Step 7: Insert chunks
  await query('DELETE FROM chunks WHERE source_id = $1', [sourceId]);

  for (let i = 0; i < chunks.length; i++) {
    const embeddingStr = `[${embeddings[i].join(',')}]`;
    await query(
      `INSERT INTO chunks (source_id, user_id, chunk_index, content, token_count, embedding)
             VALUES ($1, $2, $3, $4, $5, $6::vector)`,
      [
        sourceId,
        userId,
        i,
        chunks[i],
        Math.ceil(chunks[i].length / 4),
        embeddingStr,
      ],
    );
  }

  // Step 8: Update source to ready
  await query(
    "UPDATE sources SET status = 'ready', total_chunks = $1 WHERE id = $2",
    [chunks.length, sourceId],
  );

  logger.info({ sourceId, chunks: chunks.length }, 'Source ingest complete');
}
