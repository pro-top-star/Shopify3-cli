export const configurationFileNames = {
  app: 'shopify.app.toml',
  extension: {
    ui: 'shopify.ui.extension.toml',
    theme: 'shopify.theme.extension.toml',
    function: 'shopify.function.extension.toml',
  },
  web: 'shopify.web.toml',
} as const

export const dotEnvFileNames = {
  production: '.env',
}

export const environmentVariables = {
  /**
   * Environment variable to instructs the CLI on running the extensions' CLI through its sources.
   */
  useExtensionsCLISources: 'SHOPIFY_USE_EXTENSIONS_CLI_SOURCES',
} as const

export const versions = {
  extensionsBinary: 'v0.11.0',
} as const

export const blocks = {
  extensions: {
    directoryName: 'extensions',
    configurationName: configurationFileNames.extension,
  },
  functions: {
    defaultUrl: 'https://github.com/Shopify/scripts-apis-examples',
    defaultLanguage: 'wasm',
  },
  web: {
    directoryName: 'web',
    configurationName: configurationFileNames.web,
  },
} as const

/**
 * List of extensions for each category that are limited by quantity, only 1 of each is allowed per app
 */
export const limitedExtensions = {
  ui: ['product_subscription'],
  theme: ['theme'],
  function: [],
}

export const genericConfigurationFileNames = {
  yarn: {
    lockfile: 'yarn.lock',
  },
  pnpm: {
    lockfile: 'pnpm-lock.yaml',
  },
} as const

export const functionExtensions = {
  types: ['product_discounts', 'order_discounts', 'shipping_discounts', 'payment_methods', 'shipping_rate_presenter'],
} as const

export type FunctionExtensionTypes = typeof functionExtensions.types[number]

export const uiExtensions = {
  types: ['product_subscription', 'checkout_ui_extension', 'checkout_post_purchase', 'beacon_extension'],
} as const

export type UIExtensionTypes = typeof uiExtensions.types[number]

export const themeExtensions = {
  types: ['theme'],
} as const

export type ThemeExtensionTypes = typeof themeExtensions.types[number]

export const extensions = {
  types: [...themeExtensions.types, ...uiExtensions.types, ...functionExtensions.types],
}

export type ExtensionTypes = typeof extensions.types[number]

export function extensionTypeCategory(extensionType: ExtensionTypes): 'theme' | 'function' | 'ui' {
  if (extensionType === 'theme') {
    return 'theme'
  }
  if ((functionExtensions.types as ReadonlyArray<string>).includes(extensionType)) {
    return 'function'
  }
  return 'ui'
}

/**
 * Returns the runtime renderer dependency for a given UI extension type.
 * @param extensionType {UIExtensionTypes} Extension type.
 * @returns The renderer dependency that should be present in the app's package.json
 */
export function getUIExtensionRendererDependency(extensionType: UIExtensionTypes): string | undefined {
  switch (extensionType) {
    case 'product_subscription':
      return '@shopify/admin-ui-extensions-react'
    case 'checkout_ui_extension':
      return '@shopify/checkout-ui-extensions-react'
    case 'checkout_post_purchase':
      return '@shopify/post-purchase-ui-extensions-react'
    case 'beacon_extension':
      return undefined
  }
}
