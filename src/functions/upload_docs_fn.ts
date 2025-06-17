import { GSContext, GSStatus } from "@godspeedsystems/core";
import { ingestUploadedFile } from "../helper/ingestGithubRepo";

export default async function(ctx: GSContext): Promise<GSStatus> {
  const { file, filename } = ctx.inputs.data.body;
  try {
     const res = await ingestUploadedFile(file,filename)

    return new GSStatus(true, 200, undefined, {
      message: res,
    });

  } catch (err) {
    ctx.logger.error("Error processing file:", err);
    return new GSStatus(false, 500, undefined, "Failed to parse and ingest document");
  }
}
