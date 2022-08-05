/* eslint-disable @typescript-eslint/naming-convention */
import * as environment from './environment.js'
import {platformAndArch} from './os.js'
import {resolve} from './path.js'
import {version as rubyVersion} from './node/ruby.js'
import {content, debug, token} from './output.js'
import constants from './constants.js'
import * as metadata from './metadata.js'
import {publishEvent, MONORAIL_COMMAND_TOPIC} from './monorail.js'
import {fanoutHooks} from './plugins.js'
import {packageManagerUsedForCreating} from './node/node-package-manager.js'
import {Interfaces} from '@oclif/core'

interface StartOptions {
  command: string
  args: string[]
  currentTime?: number
  commandClass?: Interfaces.Command.Class
}

export const start = ({command, args, currentTime = new Date().getTime(), commandClass}: StartOptions) => {
  metadata.addSensitive({
    commandStartOptions: {
      startTime: currentTime,
      startCommand: command,
      startArgs: args,
    },
  })
  metadata.addPublic({
    cmd_all_launcher: packageManagerUsedForCreating(),
    cmd_all_plugin: commandClass?.plugin?.name,
  })
}

interface ReportEventOptions {
  config: Interfaces.Config
  errorMessage?: string
}

/**
 * Report an analytics event, sending it off to Monorail -- Shopify's internal analytics service.
 *
 * The payload for an event includes both generic data, and data gathered from installed plug-ins.
 *
 */
export async function reportEvent(options: ReportEventOptions) {
  try {
    const payload = await buildPayload(options)
    if (payload === undefined) {
      // Nothing to log
      return
    }
    if (!environment.local.alwaysLogAnalytics() && environment.local.analyticsDisabled()) {
      debug(content`Skipping command analytics, payload: ${token.json(payload)}`)
      return
    }
    const response = await publishEvent(MONORAIL_COMMAND_TOPIC, payload.public, payload.sensitive)
    if (response.type === 'error') {
      debug(response.message)
    }
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (error) {
    let message = 'Failed to report usage analytics'
    if (error instanceof Error) {
      message = message.concat(`: ${error.message}`)
    }
    debug(message)
  }
}

const buildPayload = async ({config, errorMessage}: ReportEventOptions) => {
  const {commandStartOptions, ...sensitiveMetadata} = metadata.getAllSensitive()
  if (commandStartOptions === undefined) {
    debug('Unable to log analytics event - no information on executed command')
    return
  }
  const {startCommand, startArgs, startTime} = commandStartOptions
  const currentTime = new Date().getTime()

  let directory = process.cwd()
  const pathFlagIndex = startArgs.indexOf('--path')
  if (pathFlagIndex >= 0) {
    directory = resolve(startArgs[pathFlagIndex + 1])
  }

  const {platform, arch} = platformAndArch()

  const {'@shopify/app': appPublic, ...otherPluginsPublic} = await fanoutHooks(config, 'public_command_metadata', {})
  const {
    partner_id,
    project_type,
    api_key,
    cmd_extensions_binary_from_source,
    cmd_scaffold_required_auth,
    cmd_scaffold_template_custom,
    cmd_scaffold_template_flavor,
    cmd_scaffold_type,
    cmd_scaffold_type_family,
    cmd_scaffold_type_gated,
    cmd_scaffold_type_owner,
    cmd_scaffold_used_prompts_for_type,
    ...otherShopifyAppPublic
  } = appPublic ?? {}

  const sensitivePluginData = await fanoutHooks(config, 'sensitive_command_metadata', {})

  return {
    public: {
      command: startCommand,
      time_start: startTime,
      time_end: currentTime,
      total_time: currentTime - startTime,
      success: errorMessage === undefined,
      uname: `${platform} ${arch}`,
      cli_version: await constants.versions.cliKit(),
      ruby_version: (await rubyVersion()) || '',
      node_version: process.version.replace('v', ''),
      is_employee: await environment.local.isShopify(),
      partner_id,
      api_key,
      project_type,
      cmd_extensions_binary_from_source,
      cmd_scaffold_required_auth,
      cmd_scaffold_template_custom,
      cmd_scaffold_template_flavor,
      cmd_scaffold_type,
      cmd_scaffold_type_family,
      cmd_scaffold_type_gated,
      cmd_scaffold_type_owner,
      cmd_scaffold_used_prompts_for_type,
      ...metadata.getAllPublic(),
    },
    sensitive: {
      args: startArgs.join(' '),
      error_message: errorMessage,
      metadata: JSON.stringify({
        ...sensitiveMetadata,
        extraPublic: {
          '@shopify/app': otherShopifyAppPublic,
          ...otherPluginsPublic,
        },
        extraSensitive: sensitivePluginData,
      }),
    },
  }
}
