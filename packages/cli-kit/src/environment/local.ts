import constants from '../constants'
import {exists as fileExists} from '../file'

import {isTruthy} from './utilities'
import {isSpin} from './spin'

/**
 * Returns true if the CLI is running in debug mode.
 * @param env The environment variables from the environment of the current process.
 * @returns true if SHOPIFY_CONFIG is debug
 */
export function isDebug(env = process.env): boolean {
  return isTruthy(env[constants.environmentVariables.debug])
}

/**
 * Returns true if the environment in which the CLI is running is either
 * a local environment (where dev is present) or a cloud environment (spin).
 * @returns {boolean} True if the CLI is used in a Shopify environment.
 */
export async function isShopify(): Promise<boolean> {
  const devInstalled = await fileExists(constants.paths.executables.dev)
  return devInstalled || isSpin()
}
