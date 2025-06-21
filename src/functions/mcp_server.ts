import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import { RAGPipeline } from "../helper/mcpRag";


export default async function handleQuery(ctx: GSContext, args: PlainObject) {
  const query =  ctx.inputs?.data?.body?.body?.query;

  if (!query || typeof query !== 'string') {
    return new GSStatus(false, 400,'Invalid query');
  }
  // if(!process.env.GOOGLE_API_KEY){
  //   return new GSStatus(false, 400, 'Google API key is not set, Please set the GOOGLE_API_KEY in Saarthi\'s Global MCP settings.');
  // }

  const rag = new RAGPipeline();
  const result = await rag.run(query);

  return new GSStatus(true, 200, undefined, result);
}
