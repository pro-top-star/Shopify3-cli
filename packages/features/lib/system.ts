import pc from 'picocolors';

import {isDebug} from './environment';

const execa = require('execa');

interface ExecOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

/**
 * It provides a promise-based interface for running system processes.
 * The implementation forwards the standard
 * output and error if the variable DEBUG=1 is set when running acceptance
 * tests.
 * @param command The command to be executed.
 * @returns A promise that resolves or rejects when the command execution finishes.
 */
export const exec = async (
  command: string,
  args: string[] = [],
  options?: ExecOptions,
) => {
  const _options: any = {...options, stdout: undefined, stderr: undefined};
  const commandProcess = execa(command, args, _options);
  const shortCommand = command.split('/').at(-1);
  commandProcess.stdout.on('data', (data: string) => {
    if (isDebug) {
      process.stdout.write(pc.gray(`${pc.bold(shortCommand)}: ${data}`));
    }
  });
  commandProcess.stderr.on('data', (data: string) => {
    if (isDebug) {
      process.stderr.write(pc.gray(`${pc.bold(shortCommand)}: ${data}`));
    }
  });
  await commandProcess;
};
