/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

import {Command, Flags} from '@oclif/core';
import {prompt} from 'enquirer';
import {yellow} from 'kolorist';
import minimist from 'minimist';

import {copy} from '../scripts/utils';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const argv = minimist(process.argv.slice(2));

const cwd = process.cwd();

const TEMPLATES = ['hydrogen'];

const renameFiles = {
  _gitignore: '.gitignore',
};

export default class Init extends Command {
  async run(): Promise<void> {
    let targetDir = argv._[0];
    if (!targetDir) {
      /**
       * @type {{ projectName: string }}
       */
      const {projectName} = await prompt({
        type: 'input',
        name: 'projectName',
        message: `Project name:`,
        initial: 'hydrogen-app',
      });
      targetDir = projectName;
    }

    const packageName = await getValidPackageName(targetDir);
    const root = path.join(cwd, targetDir);
    console.log(`\nScaffolding Hydrogen app in ${root}...`);

    // eslint-disable-next-line no-negated-condition
    if (!fs.existsSync(root)) {
      fs.mkdirSync(root, {recursive: true});
    } else {
      const existing = fs.readdirSync(root);
      if (existing.length) {
        /**
         * @type {{ yes: boolean }}
         */
        const {yes} = await prompt({
          type: 'confirm',
          name: 'yes',
          initial: 'Y',
          message:
            `Target directory ${targetDir} is not empty.\n` +
            `Remove existing files and continue?`,
        });
        if (yes) {
          emptyDir(root);
        } else {
          return;
        }
      }
    }

    const firstAndOnlyTemplate =
      TEMPLATES && TEMPLATES.length && TEMPLATES.length === 1 && TEMPLATES[0];

    // Determine template
    let template = argv.t || argv.template || firstAndOnlyTemplate;
    let message = 'Select a template:';
    let isValidTemplate = false;

    // --template expects a value
    if (typeof template === 'string') {
      isValidTemplate = TEMPLATES.includes(template);
      message = `${template} isn't a valid template. Please choose from below:`;
    }

    if (!template || !isValidTemplate) {
      /**
       * @type {{ t: string }}
       */
      const {t} = await prompt({
        type: 'select',
        name: 't',
        message,
        choices: TEMPLATES,
      });
      template = t;
    }

    const templateDir = path.join(
      __dirname,
      '../../templates',
      `template-${template}`,
    );

    const write = (file, content) => {
      const targetPath = renameFiles[file]
        ? path.join(root, renameFiles[file])
        : path.join(root, file);
      if (content) {
        fs.writeFileSync(targetPath, content);
      } else {
        copy(path.join(templateDir, file), targetPath);
      }
    };

    const files = fs.readdirSync(templateDir);
    const skipFiles = ['package.json', 'node_modules', 'dist'];
    for (const file of files.filter((file) => !skipFiles.includes(file))) {
      write(file);
    }

    const pkg = JSON.stringify(
      fs.readFileSync(path.join(templateDir, `package.json`), 'utf-8'),
    );

    pkg.name = packageName;

    /**
     * When the user is running a LOCAL version of hydrogen external from the
     * monorepo, they expect to use the local version of the library instead
     * of the registry version. We need to use a file reference here because
     * yarn fails to link scoped packages.
     **/

    if (process.env.LOCAL) {
      pkg.dependencies['@shopify/hydrogen'] =
        'file:../../Shopify/hydrogen/packages/hydrogen';
    }

    /**
     * Rewrite some scripts to strip out custom environment variables
     * we add for use in the monorepo (LOCAL_DEV).
     */
    for (const scriptName of ['dev']) {
      const match = pkg.scripts[scriptName].match(/(vite( .*)?)$/);
      if (match) {
        pkg.scripts[scriptName] = match[0];
      }
    }

    write('package.json', JSON.stringify(pkg, null, 2));

    const pkgManager = /yarn/.test(process.env.npm_execpath) ? 'yarn' : 'npm';

    console.log(`\nDone. Now:\n`);
    console.log(
      `  Update ${yellow(
        `${packageName}/shopify.config.js`,
      )} with the values for your storefront. If you want to test your Hydrogen app using the demo store, you can skip this step.`,
    );
    console.log(`\nand then run:\n`);
    if (root !== cwd) {
      console.log(`  cd ${path.relative(cwd, root)}`);
    }

    /**
     * The LOCAL option only works with Yarn due to issues with NPM
     * and symlinking yarn monorepos.
     */
    const usesYarn = pkgManager === 'yarn' || process.env.LOCAL;

    console.log(`  ${usesYarn ? `yarn` : `npm install --legacy-peer-deps`}`);
    console.log(`  ${usesYarn ? `yarn dev` : `npm run dev`}`);
    console.log();
  }
}

async function getValidPackageName(projectName) {
  const packageNameRegExp =
    /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
  if (packageNameRegExp.test(projectName)) {
    return projectName;
  } else {
    const suggestedPackageName = projectName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/^[._]/, '')
      .replace(/[^a-z0-9-~]+/g, '-');

    /**
     * @type {{ inputPackageName: string }}
     */
    const {inputPackageName} = await prompt({
      type: 'input',
      name: 'inputPackageName',
      message: `Package name:`,
      initial: suggestedPackageName,
      validate: (input) =>
        packageNameRegExp.test(input) ? true : 'Invalid package.json name',
    });
    return inputPackageName;
  }
}

function emptyDir(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const file of fs.readdirSync(dir)) {
    const abs = path.resolve(dir, file);
    if (fs.lstatSync(abs).isDirectory()) {
      emptyDir(abs);
      fs.rmdirSync(abs);
    } else {
      fs.unlinkSync(abs);
    }
  }
}
