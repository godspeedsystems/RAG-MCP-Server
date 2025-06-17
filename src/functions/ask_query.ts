import { GSContext, GSStatus } from "@godspeedsystems/core";
import { CompleteRAGPipeline } from "../helper/ragPipeline";


export default async function(ctx: GSContext): Promise<GSStatus> {
  const query = ctx.inputs.data.body.query;
  const rag = new CompleteRAGPipeline();
  const result = await rag.run(query);

  return new GSStatus(true, 200, undefined, { answer: result.answer , sources: result.source_files });
}
