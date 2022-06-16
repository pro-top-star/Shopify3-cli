/* eslint-disable @typescript-eslint/naming-convention */
import {version} from '../../package.json'
import {environment, http, os, output, path, ruby, store} from '@shopify/cli-kit'

export const url = 'https://monorail-edge.shopifysvc.com/v1/produce'

export const reportEvent = async (command: string, args: string[]) => {
  if (environment.local.isDebug() || environment.local.analyticsDisabled()) {
    return
  }
  try {
    const currentTime = new Date().getTime()
    const payload = await buildPayload(command, args, currentTime)
    const body = JSON.stringify(payload)
    const headers = buildHeaders(currentTime)

    const response = await http.fetch(url, {method: 'POST', body, headers})
    if (response.status === 200) {
      output.debug(`Analytics event sent: ${body}`)
    } else {
      output.debug(`Failed to report usage analytics: ${response.statusText}`)
    }
    // eslint-disable-next-line no-catch-all/no-catch-all
  } catch (error) {
    let message = 'Failed to report usage analytics'
    if (error instanceof Error) {
      message = message.concat(`: ${error.message}`)
    }
    output.debug(message)
  }
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
    directory = path.resolve(args[pathFlagIndex + 1])
  }
  const appInfo = store.getAppInfo(directory)
  const {platform, arch} = os.platformAndArch()

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
      project_type: 'node',
      command,
      args: args.join(' '),
      time_start: currentTime,
      time_end: currentTime,
      total_time: 0,
      success: true,
      uname: `${platform} ${arch}`,
      cli_version: version,
      ruby_version: (await ruby.version()) || '',
      node_version: process.version.replace('v', ''),
      is_employee: await environment.local.isShopify(),
      api_key: appInfo?.appId,
      partner_id: partnerIdAsInt,
    },
  }
}
