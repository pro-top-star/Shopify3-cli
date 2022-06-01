import {FunctionExtension, Identifiers} from '../../models/app/app'
import {api, error, session, http, id} from '@shopify/cli-kit'

import fs from 'fs'

interface UploadUIExtensionsBundleOptions {
  /** The application API key */
  apiKey: string

  /** The path to the bundle file to be uploaded */
  bundlePath: string

  /** Extensions extra data */
  extensions: {
    uuid: string
    config: string
    context: string
  }[]
}

/**
 * Uploads a bundle.
 * @param options {UploadUIExtensionsBundleOptions} The upload options
 */
export async function uploadUIExtensionsBundle(options: UploadUIExtensionsBundleOptions) {
  const token = await session.ensureAuthenticatedPartners()
  const deploymentUUID = id.generateRandomUUID()
  const signedURL = await generateUrl(options.apiKey, deploymentUUID)

  const formData = http.formData()
  const buffer = fs.readFileSync(options.bundlePath)
  formData.append('my_upload', buffer)
  await http.fetch(signedURL, {
    method: 'put',
    body: buffer,
    headers: formData.getHeaders(),
  })

  const variables: api.graphql.CreateDeploymentVariables = {
    apiKey: options.apiKey,
    uuid: deploymentUUID,
    bundleUrl: signedURL,
    extensions: options.extensions,
  }

  const mutation = api.graphql.CreateDeployment
  const result: api.graphql.CreateDeploymentSchema = await api.partners.request(mutation, token, variables)
  if (result.deploymentCreate && result.deploymentCreate.userErrors && result.deploymentCreate.userErrors.length > 0) {
    const errors = result.deploymentCreate.userErrors.map((error) => error.message).join(', ')
    throw new error.Abort(errors)
  }
}

/**
 * It generates a URL to upload an app bundle.
 * @param apiKey {string} The application API key
 * @param deploymentUUID {string} The unique identifier of the deployment.
 * @returns
 */
export async function generateUrl(apiKey: string, deploymentUUID: string) {
  const mutation = api.graphql.GenerateSignedUploadUrl
  const token = await session.ensureAuthenticatedPartners()
  const variables: api.graphql.GenerateSignedUploadUrlVariables = {
    apiKey,
    deploymentUuid: deploymentUUID,
    bundleFormat: 1,
  }

  const result: api.graphql.GenerateSignedUploadUrlSchema = await api.partners.request(mutation, token, variables)
  if (
    result.deploymentGenerateSignedUploadUrl &&
    result.deploymentGenerateSignedUploadUrl.userErrors &&
    result.deploymentGenerateSignedUploadUrl.userErrors.length > 0
  ) {
    const errors = result.deploymentGenerateSignedUploadUrl.userErrors.map((error) => error.message).join(', ')
    throw new error.Abort(errors)
  }

  return result.deploymentGenerateSignedUploadUrl.signedUploadUrl
}

interface UploadFunctionExtensionsOptions {
  apiKey: string
  identifiers: Identifiers
}

export async function uploadFunctionExtensions(
  extensions: FunctionExtension[],
  options: UploadFunctionExtensionsOptions,
): Promise<Identifiers> {
  // TODO
  return options.identifiers
}
