import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/persistence/prisma/prisma.service';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a 768-dimensional vector embedding for the input text using Gemini API.
   * Falls back to a mock vector in development if no API key is set.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      this.logger.log('GEMINI_API_KEY not configured. Generating mock 768-dim vector.');
      return this.generateMockVector();
    }

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: { parts: [{ text }] },
          }),
        }
      );

      if (!res.ok) {
        throw new Error(`Google API returned status ${res.status}`);
      }

      const data = await res.json();
      const vector = data.embedding?.values;

      if (!vector || !Array.isArray(vector)) {
        throw new Error('Invalid embedding response from Gemini');
      }

      return vector;
    } catch (err: any) {
      this.logger.error(`Failed to generate real embedding: ${err.message}. Falling back to mock.`, err.stack);
      return this.generateMockVector();
    }
  }

  private generateMockVector(): number[] {
    // Generate a static deterministic vector of size 768 filled with zeros (for offline resilience)
    return new Array(768).fill(0);
  }

  /**
   * Chunks a document into overlapping segments, vectorizes them, and stores them in PostgreSQL.
   */
  async ingestDocument(title: string, rawText: string): Promise<void> {
    this.logger.log(`Ingesting document: "${title}" (${rawText.length} characters)`);

    // 1. Chunking algorithm: split text into ~1000 characters with ~200 characters overlap
    const chunkSize = 1000;
    const overlap = 200;
    const chunks: string[] = [];

    let startIndex = 0;
    while (startIndex < rawText.length) {
      const endIndex = Math.min(startIndex + chunkSize, rawText.length);
      let chunk = rawText.substring(startIndex, endIndex);

      // Attempt to split at a sentence boundary or line break to maintain context coherence
      if (endIndex < rawText.length) {
        const lastPeriod = chunk.lastIndexOf('.');
        const lastNewLine = chunk.lastIndexOf('\n');
        const splitIndex = Math.max(lastPeriod, lastNewLine);
        if (splitIndex > 500) {
          const cutLen = splitIndex + 1;
          chunk = chunk.substring(0, cutLen);
          startIndex += cutLen - overlap;
        } else {
          startIndex += chunkSize - overlap;
        }
      } else {
        startIndex = rawText.length;
      }

      const cleanChunk = chunk.trim();
      if (cleanChunk.length > 0) {
        chunks.push(cleanChunk);
      }
    }

    // 2. Save document record
    const document = await this.prisma.taxDocument.create({
      data: { title },
    });

    this.logger.log(`Generated ${chunks.length} chunks. Creating embeddings and inserting to DB...`);

    // 3. Vectorize and save chunks using raw SQL inserts for pgvector support
    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];
      const embedding = await this.generateEmbedding(content);

      const chunkId = `${document.id}-c${i}`;
      const vectorString = `[${embedding.join(',')}]`;

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "TaxDocumentChunk" ("id", "taxDocumentId", "content", "embedding", "createdAt") 
         VALUES ($1, $2, $3, $4::vector, NOW())`,
        chunkId,
        document.id,
        content,
        vectorString
      );
    }

    this.logger.log(`✅ Document "${title}" ingested successfully with ${chunks.length} chunks.`);
  }

  /**
   * Retrieves the top relevant document chunks for a given question using cosine similarity.
   */
  async retrieveContext(question: string, limit = 3): Promise<string[]> {
    const questionEmbedding = await this.generateEmbedding(question);
    const vectorString = `[${questionEmbedding.join(',')}]`;

    try {
      // Operator <=> is Cosine Distance. Lower is more similar.
      const results = await this.prisma.$queryRawUnsafe<Array<{ content: string }>>(
        `SELECT "content" FROM "TaxDocumentChunk" 
         ORDER BY "embedding" <=> $1::vector ASC 
         LIMIT $2`,
        vectorString,
        limit
      );

      return results.map((r) => r.content);
    } catch (err: any) {
      this.logger.error(`Failed to retrieve context: ${err.message}`, err.stack);
      return [];
    }
  }
}
