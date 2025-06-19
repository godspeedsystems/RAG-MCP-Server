import { VectorStore } from './vectorStore';
const fs = require('fs');
const logStream = fs.createWriteStream('logs.txt', { flags: 'a' });

console.log = function(message) {
  logStream.write(`${new Date().toISOString()} - ${message}\n`);
};

export class RAGPipeline {
    private vs: VectorStore;
    constructor() {
        console.log('Loading vector store...');
        this.vs = new VectorStore();
        console.log('Vector store loaded...');
    }
    async run(query: string, k: number = 5): Promise<{ context: string; source_files: string }> {
        console.log('Querying docs...');
        const docs = await this.vs.search(query, k);
        console.log('Creating context...');
        const unique_docs = Array.from(new Set(docs.map((doc) => `${doc.content}`)));
        const context = unique_docs.join('\n');
        console.log('Creating messages...');
        const unique_sourceFiles = Array.from(new Set(docs.map((doc) => doc.docId)));
        const sourceFiles = unique_sourceFiles.join('\n');
        console.log(sourceFiles);

        return {
            context: context,
            source_files: sourceFiles
        };
    }
}
