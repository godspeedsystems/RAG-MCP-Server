import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import { RAGPipeline } from "../helper/mcpRag";


export default async function handleQuery(ctx: GSContext, args: PlainObject) {
  const query =  ctx.inputs?.data?.body?.body?.query;

  if (!query || typeof query !== 'string') {
    return new GSStatus(false, 400, 'Invalid query');
  }

  const rag = new RAGPipeline();
  const result = await rag.run(query);

  return new GSStatus(true, 200, undefined, result);
}
