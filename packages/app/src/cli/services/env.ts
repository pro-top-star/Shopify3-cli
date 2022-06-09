import {fetchOrgAndApps, fetchOrganizations} from './dev/fetch'
import {selectOrCreateApp} from './dev/select-app'
import {selectOrganizationPrompt} from '../prompts/dev'

import {App} from '../models/app/app'
import {session, output} from '@shopify/cli-kit'

interface EnvOptions {
  app: App
}

export default async function env(options: EnvOptions) {
  const token = await session.ensureAuthenticatedPartners()

  const orgs = await fetchOrganizations(token)
  const org = await selectOrganizationPrompt(orgs)
  const {organization, apps} = await fetchOrgAndApps(org.id, token)

  const selectedApp = await selectOrCreateApp(options.app, apps, organization, token)

  output.newline()
  output.info(
    output.content`Use these environment variables to set up your deployment pipeline for this app:
· ${output.token.green('SHOPIFY_API_KEY')}: ${selectedApp.apiKey}
· ${output.token.green('SHOPIFY_API_SECRET')}: ${selectedApp.apiSecretKeys[0].secret}
· ${output.token.green('SCOPES')}: ${options.app.configuration.scopes}
`,
  )
}
