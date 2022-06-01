import {api, path, session} from '@shopify/cli-kit'
import {readFileSync} from 'fs'
import {App, FunctionExtension} from '$cli/models/app/app'

export async function deployFunction(extension: FunctionExtension, app: App) {
  const token = await session.ensureAuthenticatedPartners()
  const uploadUrl = await uploadScript(extension, app)
  const query = api.graphql.AppFunctionSetMutation
  const variables: api.graphql.AppFunctionSetVariables = {
    extensionPointName: 'PAYMENT_METHODS',
    title: 'CUSTOM TITLE',
    description: '',
    force: true,
    schemaMajorVersion: '1',
    schemaMinorVersion: '0',
    scriptConfigVersion: '2',
    configurationUi: true,
    configurationDefinition: '{"type":"object","fields":{}}',
    moduleUploadUrl: uploadUrl,
  }
  const res: any = await api.partners.functionProxyRequest(app.configuration.id!, query, token, variables)
  console.log(JSON.stringify(res.data, null, 2))
}

async function uploadScript(extension: FunctionExtension, app: App) {
  const {url, headers} = await getUploadURL(app)
  headers['Content-Type'] = 'application/wasm'

  // MISSING: build
  const builtFunctionPath = path.join(extension.directory, 'build/index.wasm')
  const functionContent = readFileSync(builtFunctionPath, 'binary')
  await fetch(url, {body: functionContent, headers, method: 'PUT'})
  return url
}

async function getUploadURL(app: App): Promise<{url: string; headers: any}> {
  const token = await session.ensureAuthenticatedPartners()
  const query = api.graphql.ModuleUploadUrlGenerateMutation
  const res: api.graphql.ModuleUploadUrlGenerateMutationSchema = await api.partners.functionProxyRequest(
    app.configuration.id!,
    query,
    token,
  )
  return res.data.moduleUploadUrlGenerate.details
}

export const functionExtensionPointNameMapper = (type: string) => {
  if (type === 'product_discount_type' || type === 'order_discount_type' || type === 'shipping_discount_type') {
    return 'DISCOUNT'
  } else if (type === 'payment_methods') {
    return 'PAYMENT_METHODS'
  } else if (type === 'shipping_rate_presenter') {
    return 'SHIPPING_METHODS'
  }
  return undefined
}
