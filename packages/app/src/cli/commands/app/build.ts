import {Command} from '@oclif/core'
import {session, ui} from '@shopify/cli-kit'
import {message} from '@shopify/cli-kit/src/output'

export default class Build extends Command {
  static description = 'Build a block or an app'

  async run(): Promise<void> {
    await session.ensureAuthenticated({})
  }
}
