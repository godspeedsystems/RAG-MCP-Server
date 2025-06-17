import { GSContext, GSStatus, PlainObject } from '@godspeedsystems/core';
import { appendFileSync } from "fs";
import axios from "axios";


function formatGeminiMessages(messages: { role: string; content: string }[]) {
  return {
    contents: [
      {
        parts: messages.map(m => ({
          text: `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
        }))
      }
    ]
  };
}

export default async function handle_api_key(ctx: GSContext, args: PlainObject): Promise<GSStatus> {
  const google_key  = ctx.inputs?.data?.body?.body?.api_key;
  if (!google_key) {
    throw new Error("Missing key or value to write to .env");
  }
  
  const envLine = `\nGOOGLE_API_KEY=${google_key}`;

  const prompt = formatGeminiMessages([
    {
      role: "user",
      content: `This is just a testing message to check if GOOGLE_API_KEY is valid or not. If you get request please response following:
      -[GOOGLE_API_KEY is VALID]`
    }
    ]);
  try{
    const geminiResp = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${google_key}`,
      prompt,
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

  const geminireply = geminiResp.data.candidates[0].content.parts[0].text.trim();

  appendFileSync(`${process.cwd()}/.env`, envLine);
  ctx.logger.info(`Saved GOOGLE_API_KEY to .env`);
  return new GSStatus(true,200,`Saved GOOGLE_API_KEY successfully.`);

 } catch (err){

    return new GSStatus(false,400,`Provided GOOGLE_API_KEY is invalid.`);

 }
}

