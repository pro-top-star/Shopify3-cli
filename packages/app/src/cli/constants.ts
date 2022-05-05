export const configurationFileNames = {
  app: 'shopify.app.toml',
  extension: {
    ui: 'shopify.extension.toml',
    theme: 'shopify.theme.extension.toml',
    function: 'shopify.function.extension.toml',
  },
  home: 'shopify.home.toml',
}

export const environmentVariables = {
  /**
   * Environment variable to instructs the CLI on running the extensions' CLI through its sources.
   */
  useExtensionsCLISources: 'SHOPIFY_USE_EXTENSIONS_CLI_SOURCES',
}

export const versions = {
  extensionsBinary: 'v0.6.0',
}

export const blocks = {
  extensions: {
    directoryName: 'extensions',
    configurationName: configurationFileNames.extension,
  },
  functions: {
    defaultUrl: 'https://github.com/Shopify/scripts-apis-examples',
    defaultLanguage: 'wasm',
  },
  home: {
    directoryName: 'home',
    configurationName: configurationFileNames.home,
  },
}

export const genericConfigurationFileNames = {
  yarn: {
    lockfile: 'yarn.lock',
  },
  pnpm: {
    lockfile: 'pnpm-lock.yaml',
  },
}

export const functionExtensions: ExtensionsType = {
  types: [
    'product_discount_type',
    'order_discount_type',
    'shipping_discount_type',
    'payment_methods',
    'shipping_rate_presenter',
  ],
}

export const uiExtensions: ExtensionsType = {
  types: ['product_subscription', 'checkout_post_purchase'],
}

export const themeExtensions: ExtensionsType = {
  types: ['theme'],
}

interface ExtensionsType {
  // Dependent code requires that extensions.types has at least 1 element.
  // Otherwise it will be typed as string[] which doesn't guarantee a first element.
  types: [string, ...string[]]
}
export const extensions: ExtensionsType = {
  types: [...themeExtensions.types, ...uiExtensions.types, ...functionExtensions.types],
}

export type ExtensionTypes = typeof extensions.types[number]
