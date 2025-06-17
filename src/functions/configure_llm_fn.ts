import { GSContext, GSStatus } from "@godspeedsystems/core";
import fs from "fs";
import path from "path";

export default async function(ctx: GSContext): Promise<GSStatus> {
  const { apiKey, model } = ctx.inputs.data.body;
  const envPath = path.resolve(process.cwd(), ".env");

  let envContent = fs.readFileSync(envPath, "utf-8");
  envContent = envContent
    .replace(/OPENROUTER_API_KEY=.*/g, `OPENROUTER_API_KEY=${apiKey}`)
    .replace(/MODEL_NAME=.*/g, `MODEL_NAME=${model}`);

  if (!envContent.includes("OPENROUTER_API_KEY=")) {
    envContent += `\nOPENROUTER_API_KEY=${apiKey}`;
  }
  if (!envContent.includes("MODEL_NAME=")) {
    envContent += `\nMODEL_NAME=${model}`;
  }

  fs.writeFileSync(envPath, envContent);
  return new GSStatus(true, 200, undefined, "LLM configuration updated");
}
