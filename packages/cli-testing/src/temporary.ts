import {store, file} from '@shopify/cli-kit'
import tempy from 'tempy'
import uniqueString from 'unique-string'

/**
 * Creates a temporary directory and ties its lifecycle to the callback.
 * @param callback {(string) => void} Callback to execute. When the callback exits, the temporary directory is destroyed.
 * @returns {Promise<T>} Promise that resolves with the value returned by the callback.
 */
export async function directory<T>(callback: (directory: string) => Promise<T>): Promise<T> {
  const result = await tempy.directory.task(callback, {})
  return result
}

/**
 * Creates a temporary configuration store and ties its lifecycle to the callback.
 * @param callback {(string) => void} Callback to execute. When the callback exits, the local config is destroyed.
 * @returns {Promise<T>} Promise that resolves with the value returned by the callback.
 */
export function localConf<T>(callback: (localConf: store.LocalStore) => Promise<T>): Promise<T> {
  let localConf: store.LocalStore | undefined
  try {
    const name = `shopify-cli-test-${uniqueString()}`
    localConf = store.createConf(name)
    // eslint-disable-next-line node/callback-return
    const result = callback(localConf)
    return result
  } finally {
    if (localConf) {
      file.remove(localConf.path)
      const configFolder = localConf.path.replace(/\/config.json$/, '')
      file.remove(configFolder)
    }
  }
}
