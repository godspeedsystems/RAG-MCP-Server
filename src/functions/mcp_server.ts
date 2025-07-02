import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import { RAGPipeline } from '../helper/mcpRag';

export default async function handleQuery(ctx: GSContext, args: PlainObject) {
  const query = ctx.inputs?.data?.body?.body?.query;
  const options = ctx.inputs?.data?.body?.body?.options || {};

  if (!query || typeof query !== 'string') {
    return new GSStatus(false, 400, 'Invalid query');
  }
  // if(!process.env.GOOGLE_API_KEY){
  //   return new GSStatus(false, 400, 'Google API key is not set, Please set the GOOGLE_API_KEY in Saarthi\'s Global MCP settings.');
  // }

  try {
    const rag = new RAGPipeline();

    // Use improved RAG pipeline with better options
    const result = await rag.run(query, {
      maxResults: options.maxResults || 5,
      minRelevanceScore: options.minRelevanceScore || 0.3,
      includeMetadata: options.includeMetadata || false,
      filterByChunkType: options.filterByChunkType || [],
      maxContextLength: options.maxContextLength || 4000,
    });

    if (options.debug) {
      const stats = await rag.getContextStats(query);
      return new GSStatus(true, 200, undefined, {
        ...result,
        debug: {
          query_optimization:
            result.context.length > 0 ? 'successful' : 'failed',
          context_stats: stats,
          processing_time: new Date().toISOString(),
        },
      });
    }

    return new GSStatus(true, 200, undefined, result);
  } catch (error) {
    console.error('Error in RAG pipeline:', error);
    return new GSStatus(
      false,
      500,
      `RAG processing error: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
  }
}
