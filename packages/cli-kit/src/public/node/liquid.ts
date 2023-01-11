import {glob, join, dirname, relative} from '../../path.js'
import {mkdir, read, copy, chmod, isDirectory, write, hasExecutablePermissions} from '../../file.js'
import {content, token, debug} from '../../output.js'
import {Liquid} from 'liquidjs'

/**
 * Renders a template using the Liquid template engine.
 *
 * @param templateContent - Template content.
 * @param data - Data to feed the template engine.
 * @returns Rendered template.
 */
export function renderLiquidTemplate(templateContent: string, data: object): Promise<string> {
  const engine = new Liquid()
  return engine.render(engine.parse(templateContent), data)
}

/**
 * Given a directory, it traverses the files and directories recursively
 * and replaces variables in directory and file names, and files' content
 * using the Liquid template engine.
 * Files indicate that they are liquid template by using the .liquid extension.
 *
 * @param from - Directory that contains the template.
 * @param to - Output directory.
 * @param data - Data to feed the template engine.
 */
export async function recursiveLiquidTemplateCopy(from: string, to: string, data: object): Promise<void> {
  debug(content`Copying template from directory ${token.path(from)} to ${token.path(to)}`)
  const templateFiles: string[] = await glob(join(from, '**/*'), {dot: true})

  const sortedTemplateFiles = templateFiles
    .map((path) => path.split('/'))
    .sort((lhs, rhs) => (lhs.length < rhs.length ? 1 : -1))
    .map((components) => components.join('/'))
  await Promise.all(
    sortedTemplateFiles.map(async (templateItemPath) => {
      const outputPath = await renderLiquidTemplate(join(to, relative(from, templateItemPath)), data)
      if (await isDirectory(templateItemPath)) {
        await mkdir(outputPath)
      } else if (templateItemPath.endsWith('.liquid')) {
        await mkdir(dirname(outputPath))
        const content = await read(templateItemPath)
        const contentOutput = await renderLiquidTemplate(content, data)
        const isExecutable = await hasExecutablePermissions(templateItemPath)
        const outputPathWithoutLiquid = outputPath.replace('.liquid', '')
        await copy(templateItemPath, outputPathWithoutLiquid)
        await write(outputPathWithoutLiquid, contentOutput)
        if (isExecutable) {
          await chmod(outputPathWithoutLiquid, 0o755)
        }
      } else {
        await copy(templateItemPath, outputPath)
      }
    }),
  )
}
