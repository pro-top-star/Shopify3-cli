import {App, UIExtension} from './app.js'

export function testApp(app: Partial<App> = {}): App {
  return {
    name: app?.name ?? 'App',
    idEnvironmentVariableName: app.idEnvironmentVariableName ?? 'SHOPIFY_API_KEY',
    configuration: {
      scopes: app?.configuration?.scopes ?? '',
    },
    packageManager: app.packageManager ?? 'yarn',
    directory: app.directory ?? '/tmp/project',
    extensions: {
      ui: app?.extensions?.ui ?? [],
      function: app?.extensions?.function ?? [],
      theme: app?.extensions?.theme ?? [],
    },
    webs: app?.webs ?? [],
    nodeDependencies: app?.nodeDependencies ?? {},
    dotenv: app.dotenv,
    configurationPath: app?.configurationPath ?? '/tmp/project/shopify.app.toml',
  }
}

export function testUIExtension(uiExtension: Partial<UIExtension> = {}): UIExtension {
  return {
    localIdentifier: uiExtension?.localIdentifier ?? 'test-ui-extension',
    buildDirectory: uiExtension?.buildDirectory ?? '/tmp/project/extensions/test-ui-extension/dist',
    configuration: uiExtension?.configuration ?? {
      name: uiExtension?.configuration?.name ?? 'test-ui-extension',
      type: uiExtension?.configuration?.type ?? 'product_subscription',
      metafields: [],
    },
    type: 'checkout_post_purchase',
    graphQLType: 'CHECKOUT_POST_PURCHASE',
    configurationPath:
      uiExtension?.configurationPath ?? '/tmp/project/extensions/test-ui-extension/shopify.ui.extension.toml',
    directory: uiExtension?.directory ?? '/tmp/project/extensions/test-ui-extension',
    entrySourceFilePath: uiExtension?.entrySourceFilePath ?? '/tmp/project/extensions/test-ui-extension/src/index.js',
    idEnvironmentVariableName: uiExtension?.idEnvironmentVariableName ?? 'SHOPIFY_TET_UI_EXTENSION_ID',
    devUUID: 'devUUID',
  }
}
