import { GSContext, GSStatus } from '@godspeedsystems/core';
import { getGithubRepoFiles, getGithubData } from '../helper/github';

export default async function (ctx: GSContext): Promise<GSStatus> {
  try {
    const { components } = ctx.inputs.data.body.body;
    const filePaths = await getGithubRepoFiles();

    const finalFinalFilePaths = components
      .filter(
        ({ category, slug }: { category: string, slug: string }) =>
          filePaths.filter((fp: string) =>
            fp.endsWith(`comp-code/${category}/${slug}.html`)
          ).length > 0
      )
      .map(({ category, slug }: { category: string, slug: string }) =>
        filePaths.find((fp: string) =>
          fp.endsWith(`comp-code/${category}/${slug}.html`)
        )
      );

    const fileWithContent = await getGithubData(finalFinalFilePaths);

    const text = `
        ${fileWithContent
          .map(({ path, content }) => {
            return `
          ${path}
          ${content}
          `;
          })
          .join("\n")}

        `;

    return new GSStatus(true, 200, 'Success', { context: text });
  } catch (error: any) {
    ctx.logger.error(error, 'Error getting component code');
    return new GSStatus(false, 500, error.message);
  }
}