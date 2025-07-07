import { GSContext, GSStatus } from '@godspeedsystems/core';
import { getGithubRepoFiles, getGithubData } from '../helper/github';

export default async function (ctx: GSContext): Promise<GSStatus> {
  try {
    const filePaths = await getGithubRepoFiles();

    const [{ content }] = await getGithubData(
      filePaths.filter((fp: string) => fp.endsWith("tailwind.config.js"))
    );

    return new GSStatus(true, 200, 'Success', { context:  content });
  } catch (error: any) {
    ctx.logger.error(error, 'Error getting style guide file');
    return new GSStatus(false, 500, error.message);
  }
}