import {Then} from '@cucumber/cucumber';

import {exec} from '../lib/system';

Then(
  /I create an app named (.+) with (.+) as dependency manager/,
  {timeout: 2 * 60 * 1000},
  async function (appName: string, dependencyManager: string) {
    await exec(this.createAppExecutable, [
      '--name',
      appName,
      '--path',
      this.temporaryDirectory,
      '--dependency-manager',
      dependencyManager,
    ]);
  },
);
