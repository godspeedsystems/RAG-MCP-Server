import { GSContext, GSStatus } from '@godspeedsystems/core';
import { getGithubRepoFiles, getGithubData } from '../helper/github';

export default async function (ctx: GSContext): Promise<GSStatus> {
  try {
    const { componentNames } = ctx.inputs.data.body.body;
    const filePaths = await getGithubRepoFiles();

    const finalFinalFilePaths = componentNames
      .filter(
        (componentName: string) =>
          filePaths.filter((fp: string) =>
            fp.endsWith(`DOCS_METADATA/${componentName}.md`)
          ).length > 0
      )
      .map((componentName: string) =>
        filePaths.find((fp: string) =>
          fp.endsWith(`DOCS_METADATA/${componentName}.md`)
        )
      );

    const fileWithContent = await getGithubData(finalFinalFilePaths);

    const text = `
        ${fileWithContent
          .map(({ path, content }) => {
            return `
          ${path}\n
          ${content}\n\n
          `;
          })
          .join("\n")}

        `;

    return new GSStatus(true, 200, 'Success', { context : text});
  } catch (error: any) {
    ctx.logger.error(error, 'Error getting component variants metadata');
    return new GSStatus(false, 500, error.message);
  }
}