import {App, FunctionExtension, ThemeExtension, UIExtension} from '../models/app/app'
import {os, output, path} from '@shopify/cli-kit'

export type Format = 'json' | 'text'
interface InfoOptions {
  format: Format
}

export function info(app: App, {format}: InfoOptions) {
  if (format === 'json') {
    return output.content`${JSON.stringify(app, null, 2)}`
  } else {
    const appInfo = new AppInfo(app)
    return appInfo.output()
  }
}

class AppInfo {
  private app: App

  constructor(app: App) {
    this.app = app
  }

  output(): string {
    const sections: [string, string][] = [
      this.devConfigsSection(),
      this.projectSettingsSection(),
      this.appComponentsSection(),
      this.accessScopesSection(),
      this.systemInfoSection(),
    ]
    return sections.map((sectionContents: [string, string]) => this.section(...sectionContents)).join('\n\n')
  }

  devConfigsSection(): [string, string] {
    const title = 'Configs for Dev'
    const lines = [
      ['App', this.app.configuration.name],
      ['Dev store', 'not configured'],
    ]
    const postscript = output.content`💡 To change these, run ${output.token.command(
      `${this.app.dependencyManager} shopify dev --reset`,
    )}`.value
    return [title, `${this.linesToColumns(lines)}\n\n${postscript}`]
  }

  projectSettingsSection(): [string, string] {
    const title = 'Your Project'
    const lines = [
      ['Name', this.app.configuration.name],
      ['API key', 'not configured'],
      ['Root location', this.app.directory],
    ]
    return [title, this.linesToColumns(lines)]
  }

  appComponentsSection(): [string, string] {
    const title = 'Directory Components'

    let body = `\n${this.webComponentsSection()}`

    this.app.extensions.ui.forEach((extension: UIExtension) => {
      body += `\n\n${this.uiExtensionSubSection(extension)}`
    })
    this.app.extensions.theme.forEach((extension: ThemeExtension) => {
      body += `\n\n${this.themeExtensionSubSection(extension)}`
    })
    this.app.extensions.function.forEach((extension: FunctionExtension) => {
      body += `\n\n${this.functionExtensionSubSection(extension)}`
    })

    return [title, body]
  }

  webComponentsSection(): string {
    const subtitle = [output.content`${output.token.subheading('web app')}`.value]
    const toplevel = ['📂 webs', '']
    const sublevels = this.app.webs.map((web) => {
      return [`  📂 ${web.configuration.type}`, path.relative(this.app.directory, web.directory)]
    })

    return `${subtitle}\n${this.linesToColumns([toplevel, ...sublevels])}`
  }

  uiExtensionSubSection(extension: UIExtension): string {
    const config = extension.configuration
    const subtitle = [output.content`${output.token.subheading(config.type)}`.value]
    const details = [
      [`📂 ${config.name}`, path.relative(this.app.directory, extension.directory)],
      ['    config file', path.relative(extension.directory, extension.configurationPath)],
      ['    metafields', `${config.metafields.length}`],
    ]

    return `${subtitle}\n${this.linesToColumns(details)}`
  }

  functionExtensionSubSection(extension: FunctionExtension): string {
    const config = extension.configuration
    const subtitle = output.content`${output.token.subheading(config.type)}`.value
    const details = [
      [`📂 ${config.name}`, path.relative(this.app.directory, extension.directory)],
      ['    config file', path.relative(extension.directory, extension.configurationPath)],
    ]

    return `${subtitle}\n${this.linesToColumns(details)}`
  }

  themeExtensionSubSection(extension: ThemeExtension): string {
    const config = extension.configuration
    const subtitle = output.content`${output.token.subheading(config.type)}`.value
    const details = [
      [`📂 ${config.name}`, path.relative(this.app.directory, extension.directory)],
      ['    config file', path.relative(extension.directory, extension.configurationPath)],
    ]

    return `${subtitle}\n${this.linesToColumns(details)}`
  }

  accessScopesSection(): [string, string] {
    const title = 'Access Scopes in Root TOML File'
    const lines = this.app.configuration.scopes.split(',').map((scope) => [scope])
    return [title, this.linesToColumns(lines)]
  }

  systemInfoSection(): [string, string] {
    const title = 'Tooling and System'
    const {platform, arch} = os.platformAndArch()
    const lines: string[][] = [
      ['Shopify CLI', this.app.nodeDependencies['@shopify/cli']],
      ['Package manager', this.app.dependencyManager],
      ['OS', `${platform}-${arch}`],
      ['Shell', process.env.SHELL || 'unknown'],
      ['Node version', process.version],
    ]
    const postscript = output.content`💡 To update to the latest version of the Shopify CLI, run ${output.token.command(
      `${this.app.dependencyManager} upgrade`,
    )}`.value
    return [title, `${this.linesToColumns(lines)}\n\n${postscript}`]
  }

  linesToColumns(lines: string[][]): string {
    const widths: number[] = []
    for (let i = 0; i < lines[0].length; i++) {
      const columnRows = lines.map((line) => line[i])
      widths.push(Math.max(...columnRows.map((row) => output.unstyled(row).length)))
    }
    const paddedLines = lines
      .map((line) => {
        return line
          .map((col, index) => {
            return `${col}${' '.repeat(widths[index] - output.unstyled(col).length)}`
          })
          .join('   ')
          .trimEnd()
      })
      .join('\n')
    return paddedLines
  }

  section(title: string, body: string): string {
    return output.content`${output.token.heading(title.toUpperCase())}\n${body}`.value
  }
}
