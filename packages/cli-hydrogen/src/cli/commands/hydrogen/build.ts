import buildService from '../../services/build'
import {Command, Flags} from '@oclif/core'
import {path} from '@shopify/cli-kit'

const PLATFORM_ENTRIES = {
  node: `@shopify/hydrogen/platforms/node`,
  worker: `@shopify/hydrogen/platforms/worker`,
}

export default class Build extends Command {
  static description = 'Builds a Hydrogen storefront for production'
  static flags = {
    path: Flags.string({
      hidden: true,
      description: 'the path to your hydrogen storefront',
      env: 'SHOPIFY_HYDROGEN_PATH',
    }),
    base: Flags.string({
      description: ' the public path when served in production',
      env: 'SHOPIFY_HYDROGEN_BUILD_BASE',
    }),
    client: Flags.boolean({
      description: 'build the client code',
      env: 'SHOPIFY_HYDROGEN_BUILD_CLIENT',
      allowNo: true,
      default: true,
    }),
    target: Flags.string({
      char: 't',
      description: 'the target platform to build for (worker or node)',
      options: ['node', 'worker'],
      default: 'worker',
      env: 'SHOPIFY_HYDROGEN_BUILD_TARGET',
    }),
    entry: Flags.string({
      description: 'produce Server Side Rendering (SSR) build for node environments',
      env: 'SHOPIFY_HYDROGEN_BUILD_SSR_ENTRY',
    }),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(Build)
    const directory = flags.path ? path.resolve(flags.path) : process.cwd()

    const entry = flags.entry || PLATFORM_ENTRIES[flags.target as 'node' | 'worker']

    const targets = {
      client: flags.client,
      worker: flags.target === 'worker' ? entry : false,
      node: flags.target === 'node' ? entry : false,
    }

    await buildService({...flags, directory, targets})
  }
}
