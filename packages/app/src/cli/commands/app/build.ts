import {Command} from '@oclif/core'
import {session} from '@shopify/cli-kit'

export default class Build extends Command {
  static description = 'Build a block or an app'

  async run(): Promise<void> {
    const apps: OAauthApplications = {
      shopify: {
        storeFqdn: 'myshop.myshopify.com',
        storefrontRendererApi: {
          scopes: [],
        },
        adminApi: {
          scopes: [],
        },
      },
      partnersApi: {
        scopes: [],
      },
    }

    await session.ensureAuthenticated({})
  }
}
