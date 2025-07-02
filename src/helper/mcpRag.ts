import { VectorStore } from './vectorStore';
import * as fs from 'fs';
import * as path from 'path';

const logStream = fs.createWriteStream('logs.txt', { flags: 'a' });

const log = function (message: any) {
  logStream.write(`${new Date().toISOString()} - ${message}\n`);
};

interface QueryContext {
  context: string;
  source_files: string;
  // relevance_scores: number[];
  // chunk_types: string[];
  // total_chunks: number;
}

export class RAGPipeline {
  private vs: VectorStore;

  constructor() {
    log('Loading vector store...');
    this.vs = new VectorStore();
    log('Vector store loaded...');
  }

  async run(
    query: string,
    options: {
      maxResults?: number;
      minRelevanceScore?: number;
      includeMetadata?: boolean;
      filterByChunkType?: string[];
      maxContextLength?: number;
      includeFullDocuments?: boolean;
    } = {},
  ): Promise<QueryContext> {
    const {
      maxResults = 5,
      minRelevanceScore = 0.3,
      includeMetadata = false,
      filterByChunkType = [],
      maxContextLength = 4000,
      includeFullDocuments = true,
    } = options;

    log('Processing query: ' + query);
    const optimizedQuery = this.optimizeQuery(query);
    log('Optimized query: ' + optimizedQuery);

    const filters: any = { minRelevanceScore };
    let docs: any[] = [];

    if (filterByChunkType.length > 0) {
      const allResults: any[] = [];
      for (const chunkType of filterByChunkType) {
        const results = await this.vs.search(
          optimizedQuery,
          Math.ceil(maxResults / filterByChunkType.length),
          { ...filters, chunkType },
        );
        allResults.push(...results);
      }
      allResults.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);
      docs = allResults.slice(0, maxResults);
    } else {
      docs = await this.vs.search(optimizedQuery, maxResults * 2, filters);
    }

    log(`Found ${docs.length} relevant documents`);

    const uniqueDocIds = Array.from(new Set(docs.map((doc) => doc.docId)));
    const sourceFiles = uniqueDocIds.join('\n');

    let context = '';
    let relevanceScores: number[] = [];
    let chunkTypes: string[] = [];
    let totalChunks = 0;

    if (includeFullDocuments) {
      const fullDocuments = uniqueDocIds
        .map((docId) => {
          const meta = this.vs.metadata[docId];
          if (!meta) {
            log(`[WARN] No metadata found for ${docId}`);
            return null;
          }

          let docHeader = `[File: ${docId}]`;
          // if (meta.documentType) {
          //   docHeader += ` [Type: ${meta.documentType}]`;
          // }

          return `${docHeader}\n\n${meta.content}`;
        })
        .filter(Boolean);


      context = fullDocuments.join('\n\n');
      relevanceScores = docs.map((d) => d.relevanceScore);
      chunkTypes = docs.map((d) => d.metadata.chunkType);
      totalChunks = uniqueDocIds.length;
    } else {
      const selectedChunks = this.selectBestChunks(docs, maxContextLength);
      const uniqueChunks = this.deduplicateChunks(selectedChunks);
      context = this.formatContext(uniqueChunks, includeMetadata);
      relevanceScores = selectedChunks.map((c) => c.relevanceScore);
      chunkTypes = selectedChunks.map((c) => c.metadata.chunkType);
      totalChunks = uniqueChunks.length;
    }

    log(
      `Selected ${totalChunks} ${includeFullDocuments ? 'documents' : 'chunks'} from ${uniqueDocIds.length} files`,
    );

    log(`Context length: ${context.length} characters`);
    return {
      context,
      source_files: sourceFiles,
      // relevance_scores: relevanceScores,
      // chunk_types: chunkTypes,
      // total_chunks: totalChunks,
    };
  }

  private optimizeQuery(query: string): string {
    let optimized = query
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    const keyTerms = optimized
      .split(' ')
      .filter((word) => word.length > 3)
      .slice(0, 5);

    return keyTerms.join(' ');
  }

  private selectBestChunks(docs: any[], maxContextLength: number): any[] {
    const selectedChunks: any[] = [];
    let currentLength = 0;

    const sortedDocs = docs.sort(
      (a: any, b: any) => b.relevanceScore - a.relevanceScore,
    );

    for (const doc of sortedDocs) {
      const chunkLength = doc.chunkContent.length;

      if (currentLength + chunkLength > maxContextLength) {
        if (doc.relevanceScore > 0.7) {
          const remainingLength = maxContextLength - currentLength;
          if (remainingLength > 200) {
            const truncatedChunk = {
              ...doc,
              chunkContent:
                doc.chunkContent.substring(0, remainingLength) + '...',
            };
            selectedChunks.push(truncatedChunk);
            currentLength += remainingLength;
          }
        }
        break;
      }

      selectedChunks.push(doc);
      currentLength += chunkLength;
    }

    return selectedChunks;
  }

  private deduplicateChunks(chunks: any[]): any[] {
    const seen = new Set<string>();
    const uniqueChunks: any[] = [];

    for (const chunk of chunks) {
      const contentHash = this.hashContent(chunk.chunkContent);
      if (!seen.has(contentHash)) {
        seen.add(contentHash);
        uniqueChunks.push(chunk);
      }
    }

    return uniqueChunks;
  }

  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  private formatContext(chunks: any[], includeMetadata: boolean): string {
    const formattedChunks = chunks.map((chunk, index) => {
      let formatted = `[Chunk ${index + 1}] ${chunk.chunkContent}`;

      if (includeMetadata) {
        formatted += `\n[Source: ${chunk.docId}, Type: ${chunk.metadata.chunkType}, Relevance: ${chunk.relevanceScore.toFixed(2)}]`;
      }

      return formatted;
    });

    return formattedChunks.join('\n\n');
  }

  async getContextStats(query: string): Promise<any> {
    const docs = await this.vs.search(query, 20);

    const stats = {
      totalResults: docs.length,
      avgRelevanceScore:
        docs.reduce((sum: number, doc: any) => sum + doc.relevanceScore, 0) /
        docs.length,
      chunkTypeDistribution: {} as Record<string, number>,
      documentTypeDistribution: {} as Record<string, number>,
      topResults: docs.slice(0, 5).map((doc: any) => ({
        docId: doc.docId,
        relevanceScore: doc.relevanceScore,
        chunkType: doc.metadata.chunkType,
        contentPreview: doc.chunkContent.substring(0, 100) + '...',
      })),
    };

    for (const doc of docs) {
      stats.chunkTypeDistribution[doc.metadata.chunkType] =
        (stats.chunkTypeDistribution[doc.metadata.chunkType] || 0) + 1;

      if (doc.metadata.documentType) {
        stats.documentTypeDistribution[doc.metadata.documentType] =
          (stats.documentTypeDistribution[doc.metadata.documentType] || 0) + 1;
      }
    }

    return stats;
  }
}
