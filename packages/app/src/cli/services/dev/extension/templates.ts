import {error} from '@shopify/cli-kit'
import {readFile} from '@shopify/cli-kit/node/fs'
import {renderLiquidTemplate} from '@shopify/cli-kit/node/liquid'
import {joinPath, glob, findPathUp, moduleDirectory} from '@shopify/cli-kit/node/path'

export interface GetHTMLOptions {
  extensionSurface?: string
  template: Template
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
}

export type Template = 'index' | 'tunnel-error' | 'error'

export class TemplateNotFoundError extends error.Bug {
  constructor(options: GetHTMLOptions) {
    super(`Couldn't find template ${options.template} for extension surface ${options.extensionSurface}`)
  }
}

export async function getHTML(options: GetHTMLOptions): Promise<string> {
  const templatePath = await getTemplatePath(options)
  const templateContent = await readFile(templatePath)
  return renderLiquidTemplate(templateContent, options.data)
}

export async function getTemplatePath(options: GetHTMLOptions): Promise<string> {
  const templatesDirectory = await getTemplatesDirectory()
  const globPatterns = []
  if (options.extensionSurface) {
    globPatterns.push(joinPath(templatesDirectory, `${options.extensionSurface}/${options.template}.html.liquid`))
  }
  globPatterns.push(joinPath(templatesDirectory, `${options.template}.html.liquid`))
  const globMatches = await glob(globPatterns)
  if (globMatches.length === 0) {
    throw new TemplateNotFoundError(options)
  }
  return globMatches[0] as string
}

export async function getTemplatesDirectory(): Promise<string> {
  const directory = await findPathUp('templates/ui-extensions/html', {
    type: 'directory',
    cwd: moduleDirectory(import.meta.url),
  })
  return directory as string
}
