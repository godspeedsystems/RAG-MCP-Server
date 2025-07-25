// import { GSContext, GSStatus, PlainObject } from "@godspeedsystems/core";
import fetch from "node-fetch";
import * as fs from 'fs/promises';
import { VectorStore } from './vectorStore';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import * as path from 'path';

const vs=new VectorStore();
interface GitTreeItem {
  path: string;
  type: string;
}

interface GitTreeResponse {
  tree: GitTreeItem[];
}
interface GitHubTree {
  tree: { path: string; type: string }[];
}
interface CommitResponse {
  sha: string;
}
interface FileChange {
  filename: string;
  status: 'added' | 'modified' | 'removed';
}

interface CompareResponse {
  files: FileChange[];
}

const COMMIT_FILE = path.resolve(__dirname, '../../data/last_commit.json');
const REPO_URL_FILE = path.resolve(__dirname, '../../data/repo_url.json');

async function saveLastCommit(repo: string, commitSha: string) {
    await fs.writeFile(COMMIT_FILE, JSON.stringify({ repo, commit: commitSha }), 'utf-8');
}
async function loadLastCommit(): Promise<{ repo?: string; commit?: string }> {
    try {
        const data = await fs.readFile(COMMIT_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

async function loadRepoUrl() {
    try {
        const data = await fs.readFile(REPO_URL_FILE, 'utf-8');
        return JSON.parse(data);
    }
    catch {
        return {};
    }
}
async function getLatestCommitSha(owner: string, repo: string, branch: string): Promise<string> {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch latest commit SHA: ${res.statusText}`);
    const json = await res.json() as CommitResponse;
    return json.sha;
}
async function getChangedFiles(owner: string, repo: string, baseSha: string, headSha: string) {
    const url = `https://api.github.com/repos/${owner}/${repo}/compare/${baseSha}...${headSha}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch changed files: ${res.statusText}`);
    const json = await res.json() as CompareResponse;
    const changed: string[] = [];
    const deleted: string[] = [];

    for (const file of json.files || []) {
        if (file.status === 'modified' || file.status === 'added') changed.push(file.filename);
        else if (file.status === 'removed') deleted.push(file.filename);
    }
    return { changed, deleted };
}
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
        const data = await pdfParse(buffer);
        if (data.text && data.text.trim().length > 30) {
            return data.text;
        } else {
            const worker = await createWorker();
            const w = await worker as any;
            await w.load();
            await w.loadLanguage('eng');
            await w.initialize('eng');
            const { data: { text } } = await w.recognize(buffer);
            await w.terminate();
            return text;
        }
    } catch (e) {
        return '';
    }
}
async function ingestChangedFiles(repoUrl: string, branch = 'main'): Promise<void> {
    // const { repoUrl, branch = 'main' } = args;
    console.log("Entering...")
    const parts = repoUrl.replace(/\/$/, '').split('/');
    const owner = parts[parts.length - 2];
    const repo = parts[parts.length - 1];
    const latestSha = await getLatestCommitSha(owner, repo, branch);
    console.log("Got latest sha..")
    const state = await loadLastCommit();
    console.log("Got last commit...")
    if (state.repo === repo && state.commit === latestSha) {
        console.log('No new commit. Skipping ingestion.');
        return;
    }
    // const vs = new VectorStore();
    console.log("Created vectorstore..")
    let changedFiles: string[] = [];
    let deletedFiles: string[] = [];
    if (state.repo === repo && state.commit) {
        console.log("Getting changed files")
        const changes = await getChangedFiles(owner, repo, state.commit, latestSha);
        changedFiles = changes.changed;
        deletedFiles = changes.deleted;
    }
    else {
        // First time: get all files from HEAD
        const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
        const treeRes = await fetch(treeUrl);
        console.log("Got tree....")
        if (!treeRes.ok)
            throw new Error(`Failed to fetch repo tree: ${treeRes.statusText}`);
        const treeJson = (await treeRes.json()) as GitHubTree;
        changedFiles = treeJson.tree
            .filter((f: any) => f.type === 'blob')
            .map((f: any) => f.path);
        console.log("Got changed files...")
        deletedFiles = [];
    }
    for (const filePath of deletedFiles) {
        console.log(`Removing deleted file from vector DB: ${filePath}`);
        await vs.removeDocument(filePath);
    }
    const allowedExts = new Set(['.md', '.txt', '.pdf', '.mdx']);
    for (const filePath of changedFiles) {
        try {
            const ext = path.extname(filePath).toLowerCase();
            if (!allowedExts.has(ext))
                continue;
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
            const contentRes = await fetch(rawUrl);
            console.log("Got content...")
            if (!contentRes.ok) {
                console.log(`Failed to fetch content for: ${filePath} (status ${contentRes.status})`);
                continue;
            }
            let content;
            if (ext === '.pdf') {
                const buffer = await contentRes.buffer();
                content = await extractTextFromPdf(buffer);
            }
            else {
                content = await contentRes.text();
            }
            if (content.length > 0) {
                console.log(`Re-ingesting file: ${filePath}`);
                await vs.removeDocument(filePath);
                console.log("Done removal...")
                await vs.upsert(filePath, content);
            }
        }
        catch (e) {
            console.error(`Error processing file ${filePath}:`, e);
        }
    }
    await saveLastCommit(repo, latestSha);
    console.log('Ingestion complete.');
}

export { ingestChangedFiles, loadRepoUrl}
