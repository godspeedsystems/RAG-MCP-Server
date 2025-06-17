import { VectorStore } from './vectorStore';
import OpenAI from 'openai';

export class CompleteRAGPipeline {
    private vs: VectorStore;
    constructor() {
        console.log('Initializing OpenRouterAI model...');
        console.log(`Initialized ${process.env.MODEL_NAME} model.`);
        console.log('Loading vector store...');
        this.vs = new VectorStore();
        console.log('Vector store loaded...');
    }
    async run(query: string, k: number = 5): Promise<{ answer: string; source_files: string[] }> {
        console.log('Querying docs...');
        const docs = await this.vs.search(query, k);
        console.log('Creating context...');
        const unique_docs = Array.from(new Set(docs.map((doc) => `${doc.content}`)));
        const context = unique_docs.join('\n');
        console.log('Creating messages...');
        const sourceFiles = Array.from(new Set(docs.map((doc) => doc.docId)));
        // const sourceFiles = unique_sourceFiles
        console.log(sourceFiles);

        console.log('Asking LLM...');

        const openai = new OpenAI({
            apiKey: process.env.OPENROUTER_API_KEY,
            baseURL: 'https://openrouter.ai/api/v1',
          });


        const response = await openai.chat.completions.create({
                                       model: process.env.MODEL_NAME!, 
                                       messages: [
                                                     {
                                                      role: 'system',
                                                      content: "      \
                                                                You are a helpful assistant who understands the Godspeed Framework deeply. Always aim to provide technically sound, creative, and helpful answers to a wide range of user questions, using the documentation provided as context. \
                                                                 \
                                                                **Rules:**\
1. Always read and understand the full user query and provided context before answering.\
   - If the answer can be fully derived from the context, then answer with thorough technical clarity using at least 1000 tokens when needed.\
   - If the answer cannot be fully derived from context, say so sincerely — unless you can add well-grounded insights from general training that logically extend the documentation.\
\
2. Be versatile:\
   - Explain concepts clearly when asked for definitions or meanings.\
   - Describe how components work when asked about mechanisms.\
   - Show how to build new things using given APIs or tools when asked for implementation help.\
\
3. Respond naturally and warmly if the user is just chatting.\
\
4. When including Bash commands:\
   - Format using fenced bash blocks:\
     ```bash\
     # example\
     godspeed run app.yaml\
     ```\
\
5. When using math or formulas:\
   - Always use inline LaTeX: wrap expressions like this — $a^2 + b^2 = c^2$.\
   - Use $$ for display math on its own line, and always close math blocks properly.\
\
Your tone should be friendly but focused. If the user asks something unrelated to the documentation or framework, explain clearly that you are focused on helping with Godspeed-related tasks.".trim()
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${query}\nAnswer:`
      }
    ]
});
        
        const answer = response.choices?.[0]?.message?.content?.trim() || 'No response.';

        return {
            answer: answer,
            source_files: sourceFiles
        }
    }
}
