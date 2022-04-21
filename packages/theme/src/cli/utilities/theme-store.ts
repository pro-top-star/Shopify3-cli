import {store as conf, error} from '@shopify/cli-kit'

export function getThemeStore(flags: {store: string | undefined}): string {
  const store = flags.store || conf.getThemeStore()
  if (!store) {
    throw new error.Fatal('A store is required', 'Set the store using --store={your_store}')
  }
  conf.setThemeStore(store)
  return store
}
