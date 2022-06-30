/* eslint-disable @typescript-eslint/naming-convention */
import * as environment from './environment.js'
import {fetch} from './http.js'
import {platformAndArch} from './os.js'
import {join, resolve} from './path.js'
import {version as rubyVersion} from './ruby.js'
import {debug, content, token} from './output.js'
import {getProjectType} from './dependency.js'
import constants from './constants.js'
import {cliKitStore} from './store.js'

export const url = 'https://monorail-edge.shopifysvc.com/v1/produce'

export const reportEvent = async (command: string, args: string[]) => {
  if (environment.local.analyticsDisabled()) return

  try {
    const currentTime = new Date().getTime()
    const payload = await buildPayload(command, args, currentTime)
    const body = JSON.stringify(payload)
    const headers = buildHeaders(currentTime)

    const response = await fetch(url, {method: 'POST', body, headers})
    if (response.status === 200) {
      debug(content`Analytics event sent: ${token.json(payload)}`)
    } else {
      debug(`Failed to report usage analytics: ${response.statusText}`)
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

let startTime: number | undefined

export const startTimer = (currentTime: number = new Date().getTime()) => {
  startTime = currentTime
}

const totalTime = (currentTime: number): number | undefined => {
  if (startTime === undefined) return undefined
  return currentTime - startTime
}

const buildHeaders = (currentTime: number) => {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Monorail-Edge-Event-Created-At-Ms': currentTime.toString(),
    'X-Monorail-Edge-Event-Sent-At-Ms': currentTime.toString(),
  }
}

const buildPayload = async (command: string, args: string[] = [], currentTime: number) => {
  let directory = process.cwd()
  const pathFlagIndex = args.indexOf('--path')
  if (pathFlagIndex >= 0) {
    directory = resolve(args[pathFlagIndex + 1])
  }
  const appInfo = cliKitStore().getAppInfo(directory)
  const {platform, arch} = platformAndArch()

  const rawPartnerId = appInfo?.orgId
  let partnerIdAsInt: number | undefined
  if (rawPartnerId !== undefined) {
    partnerIdAsInt = parseInt(rawPartnerId, 10)
    if (isNaN(partnerIdAsInt)) {
      partnerIdAsInt = undefined
    }
  }

  return {
    schema_id: 'app_cli3_command/1.0',
    payload: {
      project_type: await getProjectType(join(directory, 'web')),
      command,
      args: args.join(' '),
      time_start: startTime,
      time_end: currentTime,
      total_time: totalTime(currentTime),
      success: true,
      uname: `${platform} ${arch}`,
      cli_version: await constants.versions.cliKit(),
      ruby_version: (await rubyVersion()) || '',
      node_version: process.version.replace('v', ''),
      is_employee: await environment.local.isShopify(),
      api_key: appInfo?.appId,
      partner_id: partnerIdAsInt,
    },
  }
}
