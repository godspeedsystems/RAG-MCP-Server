import { GSContext, GSStatus } from '@godspeedsystems/core';
import { ingestChangedFiles, loadRepoUrl } from '../helper/ingestGithubRepo';
import fs from 'fs';
import path from 'path';

const LAST_SYNC_FILE = path.resolve(__dirname, '../../data/last_sync_time.json');

async function getLastSyncTime() {
  if (fs.existsSync(LAST_SYNC_FILE)) {
    const content = fs.readFileSync(LAST_SYNC_FILE, "utf-8");
    const data = JSON.parse(content) as { timestamp: number };
    return data.timestamp;
  }
  return null;
}

async function updateLastSyncTime(): Promise<void> {
  fs.writeFileSync(LAST_SYNC_FILE, JSON.stringify({ timestamp: Date.now() }));
}

export default async function (ctx: GSContext): Promise<GSStatus> {
  const now = Date.now();
  let last = await getLastSyncTime();

  if (last !== null && now - last < 24 * 60 * 60 * 1000) {
      ctx.logger.info("Skipping sync: already synced in last 24h.");
      return new GSStatus(true, 200, undefined, "No sync needed");
    }

  try {
    const repo = await loadRepoUrl();
    if (!repo?.repo_url) {
      return new GSStatus(false, 400, undefined, "No repo configured");
    }
    
    ctx.logger.info(last === null ? "First-time sync..." : "Syncing updated documentation...");
    await ingestChangedFiles(repo.repo_url, repo.branch || "main");
    await updateLastSyncTime();
    return new GSStatus(true, 200, undefined, "Sync successful");
  } catch (err) {
    ctx.logger.error("Sync failed:", err);
    return new GSStatus(false, 500, undefined, "Sync failed");
  }
}
