import axios from "axios";
import { extname } from "path";

const repoUrl = {
  repo_url: "https://github.com/vishal-godspeed/ui-generation",
  branch: "main",
};
const parts = repoUrl.repo_url.replace(/\/$/, "").split("/");
const owner = parts[parts.length - 2];
const repo = parts[parts.length - 1];

export async function getGithubRepoFiles() {
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${repoUrl.branch}?recursive=1`;

  const response = await axios.get(treeUrl);
  const changedFiles = response.data.tree
    .filter((file: any) => file.type === "blob")
    .map((file: any) => file.path);

  return changedFiles;
}

export async function getGithubData(filePaths: string[]) {
  const files = [];

  for (const filePath of filePaths) {
    const ext = extname(filePath);

    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${repoUrl.branch}/${filePath}`;
    const { data: content } = await axios.get(rawUrl);

    files.push({
      path: filePath,
      content,
    });
  }

  return files;
}