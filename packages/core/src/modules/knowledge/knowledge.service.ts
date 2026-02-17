import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  KnowledgeBase, KnowledgeBaseDocument,
  KnowledgeDoc, KnowledgeDocumentDocument,
  KnowledgeChunk, KnowledgeChunkDocument,
} from '../../database/schemas/knowledge.schema';
import { ConfigService } from '@nestjs/config';

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;
const DEFAULT_TOP_K = 5;
const DEFAULT_SIMILARITY_THRESHOLD = 0.7;

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    @InjectModel(KnowledgeBase.name) private readonly kbModel: Model<KnowledgeBaseDocument>,
    @InjectModel(KnowledgeDoc.name) private readonly docModel: Model<KnowledgeDocumentDocument>,
    @InjectModel(KnowledgeChunk.name) private readonly chunkModel: Model<KnowledgeChunkDocument>,
    private readonly config: ConfigService,
  ) {}

  // --- Knowledge Base CRUD ---

  async create(ownerId: string, data: {
    name: string;
    applicationId: string;
    description?: string;
    settings?: any;
  }) {
    const kb = new this.kbModel({
      ...data,
      ownerId,
      settings: {
        chunkSize: data.settings?.chunkSize || DEFAULT_CHUNK_SIZE,
        chunkOverlap: data.settings?.chunkOverlap || DEFAULT_CHUNK_OVERLAP,
        embeddingModel: data.settings?.embeddingModel || 'text-embedding-3-small',
        retrievalTopK: data.settings?.retrievalTopK || DEFAULT_TOP_K,
        similarityThreshold: data.settings?.similarityThreshold || DEFAULT_SIMILARITY_THRESHOLD,
      },
    });
    const saved = await kb.save();
    this.logger.log(`Knowledge base created: ${saved.name} for app ${data.applicationId}`);
    return saved;
  }

  async findByApp(applicationId: string) {
    return this.kbModel.find({ applicationId }).sort({ createdAt: -1 }).exec();
  }

  async findByOwner(ownerId: string) {
    return this.kbModel.find({ ownerId }).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string) {
    const kb = await this.kbModel.findById(id);
    if (!kb) throw new NotFoundException('Knowledge base not found');
    return kb;
  }

  async update(id: string, data: Partial<KnowledgeBase>) {
    const kb = await this.findById(id);
    Object.assign(kb, data);
    return kb.save();
  }

  async delete(id: string) {
    await this.chunkModel.deleteMany({ knowledgeBaseId: id });
    await this.docModel.deleteMany({ knowledgeBaseId: id });
    await this.kbModel.findByIdAndDelete(id);
    this.logger.log(`Knowledge base ${id} deleted with all documents and chunks`);
  }

  // --- Document Management ---

  async addDocument(knowledgeBaseId: string, data: {
    fileName: string;
    fileType: string;
    fileSize: number;
    content: string;
    sourceUrl?: string;
    metadata?: Record<string, any>;
  }) {
    const kb = await this.findById(knowledgeBaseId);

    const doc = new this.docModel({
      knowledgeBaseId,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      sourceUrl: data.sourceUrl,
      metadata: data.metadata,
      status: 'processing',
    });
    const savedDoc = await doc.save();

    // Chunk the document
    try {
      const chunks = this.chunkText(
        data.content,
        kb.settings?.chunkSize || DEFAULT_CHUNK_SIZE,
        kb.settings?.chunkOverlap || DEFAULT_CHUNK_OVERLAP,
      );

      // Generate embeddings and save chunks
      const savedChunks = await this.processChunks(
        knowledgeBaseId,
        savedDoc._id.toString(),
        chunks,
        data.fileName,
      );

      // Update doc status
      savedDoc.status = 'ready';
      savedDoc.chunkCount = savedChunks.length;
      await savedDoc.save();

      // Update KB counts
      kb.documentCount = await this.docModel.countDocuments({ knowledgeBaseId });
      kb.totalChunks = await this.chunkModel.countDocuments({ knowledgeBaseId });
      await kb.save();

      this.logger.log(`Document "${data.fileName}" processed: ${savedChunks.length} chunks`);
      return savedDoc;
    } catch (err: any) {
      savedDoc.status = 'error';
      savedDoc.errorMessage = err.message;
      await savedDoc.save();
      this.logger.error(`Failed to process document "${data.fileName}": ${err.message}`);
      throw err;
    }
  }

  async getDocuments(knowledgeBaseId: string) {
    return this.docModel.find({ knowledgeBaseId }).sort({ createdAt: -1 }).exec();
  }

  async deleteDocument(documentId: string) {
    const doc = await this.docModel.findById(documentId);
    if (!doc) throw new NotFoundException('Document not found');

    await this.chunkModel.deleteMany({ documentId });
    await this.docModel.findByIdAndDelete(documentId);

    // Update KB counts
    const kb = await this.kbModel.findById(doc.knowledgeBaseId);
    if (kb) {
      kb.documentCount = await this.docModel.countDocuments({ knowledgeBaseId: doc.knowledgeBaseId });
      kb.totalChunks = await this.chunkModel.countDocuments({ knowledgeBaseId: doc.knowledgeBaseId });
      await kb.save();
    }

    this.logger.log(`Document ${documentId} deleted`);
  }

  // --- RAG Search ---

  async search(knowledgeBaseId: string, query: string, topK?: number): Promise<{
    results: Array<{ content: string; score: number; metadata: any }>;
    query: string;
  }> {
    const kb = await this.findById(knowledgeBaseId);
    const k = topK || kb.settings?.retrievalTopK || DEFAULT_TOP_K;

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    if (queryEmbedding.length > 0) {
      // Vector similarity search
      const chunks = await this.chunkModel.find({ knowledgeBaseId }).exec();
      const scored = chunks
        .filter(c => c.embedding?.length > 0)
        .map(c => ({
          content: c.content,
          score: this.cosineSimilarity(queryEmbedding, c.embedding),
          metadata: c.metadata,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k);

      return { results: scored, query };
    }

    // Fallback: text search
    const chunks = await this.chunkModel
      .find({
        knowledgeBaseId,
        content: { $regex: query.split(' ').join('|'), $options: 'i' },
      })
      .limit(k)
      .exec();

    return {
      results: chunks.map(c => ({
        content: c.content,
        score: 1.0,
        metadata: c.metadata,
      })),
      query,
    };
  }

  /**
   * Build a context string from relevant chunks for injection into AI prompts.
   */
  async buildContext(knowledgeBaseId: string, query: string): Promise<string> {
    const { results } = await this.search(knowledgeBaseId, query);
    if (results.length === 0) return '';

    return results
      .map((r, i) => `[Source ${i + 1}${r.metadata?.fileName ? ` - ${r.metadata.fileName}` : ''}]\n${r.content}`)
      .join('\n\n');
  }

  // --- Internal helpers ---

  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + chunkSize, text.length);

      // Try to break on sentence boundary
      if (end < text.length) {
        const lastPeriod = text.lastIndexOf('.', end);
        const lastNewline = text.lastIndexOf('\n', end);
        const breakPoint = Math.max(lastPeriod, lastNewline);
        if (breakPoint > start + chunkSize * 0.5) {
          end = breakPoint + 1;
        }
      }

      chunks.push(text.slice(start, end).trim());
      start = end - overlap;
      if (start >= text.length) break;
    }
    return chunks.filter(c => c.length > 0);
  }

  private async processChunks(
    knowledgeBaseId: string,
    documentId: string,
    textChunks: string[],
    fileName: string,
  ) {
    const chunks = [];
    for (let i = 0; i < textChunks.length; i++) {
      const embedding = await this.generateEmbedding(textChunks[i]);
      const chunk = new this.chunkModel({
        knowledgeBaseId,
        documentId,
        content: textChunks[i],
        embedding,
        chunkIndex: i,
        metadata: { fileName, section: `Chunk ${i + 1}` },
      });
      chunks.push(await chunk.save());
    }
    return chunks;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = this.config.get('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.debug('No OPENAI_API_KEY — skipping embedding generation');
      return [];
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.slice(0, 8000),
        }),
      });

      if (!response.ok) {
        this.logger.warn(`Embedding API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.data?.[0]?.embedding || [];
    } catch (err: any) {
      this.logger.warn(`Embedding generation failed: ${err.message}`);
      return [];
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dotProduct / denom;
  }
}
