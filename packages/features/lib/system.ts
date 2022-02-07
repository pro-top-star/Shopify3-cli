import shell from 'shelljs';

import {isDebug} from './environment';

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
export const exec = async (command: string, options?: ExecOptions) => {
  return new Promise<void>((resolve, reject) => {
    const childProcess = shell.exec(command, {
      async: true,
      silent: true,
      ...options,
    });
    let errorOutput = '';

    childProcess.stdout?.on('data', (stdout) => {
      if (isDebug) {
        process.stdout.write(stdout);
      }
    });
    childProcess.stderr?.on('data', (stderr) => {
      if (isDebug) {
        process.stderr.write(stderr);
      }
      errorOutput = errorOutput.concat(stderr);
    });
    childProcess.on('exit', (exitCode) => {
      if (exitCode === 0) {
        resolve();
      } else {
        reject(new Error(errorOutput));
      }
    });
  });
};
