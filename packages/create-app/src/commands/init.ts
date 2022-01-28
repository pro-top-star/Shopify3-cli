import {Command, Flags} from '@oclif/core';
import {path} from '@shopify/support';

import {template} from '../utils/paths';
import initService from '../services/init';

export default class Init extends Command {
  static description = 'Create a new Shopify app';
  static flags = {
    name: Flags.string({
      char: 'n',
      description: 'The name of the app to be initialized.',
      hidden: false,
    }),
    path: Flags.string({
      char: 'p',
      description: 'The path to the directory where the app will be created.',
      hidden: false,
    }),
  };

  async run(): Promise<void> {
    const templatePath = await template('app');
    const {flags} = await this.parse(Init);
    const directory = flags.path ? path.resolve(flags.path) : process.cwd();
    await initService({
      name: flags.name,
      templatePath,
      directory,
    });
  }
}
