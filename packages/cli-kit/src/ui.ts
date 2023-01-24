import {CancelExecution, AbortError, AbortSilentError} from './public/node/error.js'
import {removeFile, fileExists} from './public/node/fs.js'
import {info, completed, content, token, logUpdate, Message, Logger, stringifyMessage, debug} from './output.js'
import colors from './public/node/colors.js'
import {relativePath} from './public/node/path.js'
import {isTerminalInteractive} from './public/node/environment/local.js'
import {run as executorUI} from './ui/executor.js'
import {Listr as OriginalListr, ListrTask, ListrBaseClassOptions} from 'listr2'
import findProcess from 'find-process'

export function newListr(tasks: ListrTask[], options?: object | ListrBaseClassOptions) {
  const listr = new OriginalListr(tasks, options)
  return listr
}

export type ListrTasks = ConstructorParameters<typeof OriginalListr>[0]
export type {ListrTaskWrapper, ListrDefaultRenderer, ListrTask} from 'listr2'

export interface PromptAnswer {
  name: string
  value: string
}
export type FilterFunction = (answers: PromptAnswer[], input: string) => Promise<PromptAnswer[]>

interface BaseQuestion<TName extends string> {
  name: TName
  message: string
  preface?: string
  validate?: (value: string) => string | true
  default?: string
  result?: (value: string) => string | boolean
  choices?: QuestionChoiceType[]
  source?: (filter: FilterFunction) => FilterFunction
}

type TextQuestion<TName extends string> = BaseQuestion<TName> & {
  type: 'input'
  // a default is required, otherwise we'd show a prompt like 'undefined'
  default: string
}

type PasswordQuestion<TName extends string> = BaseQuestion<TName> & {
  type: 'password'
}

type SelectableQuestion<TName extends string> = BaseQuestion<TName> & {
  type: 'select' | 'autocomplete'
  choices: QuestionChoiceType[]
}

export type Question<TName extends string = string> =
  | TextQuestion<TName>
  | SelectableQuestion<TName>
  | PasswordQuestion<TName>

export interface QuestionChoiceType {
  name: string
  value: string
  group?: {name: string; order: number}
}

const started = (content: Message, logger: Logger) => {
  const message = `${colors.yellow('❯')} ${stringifyMessage(content)}`
  info(message, logger)
}

const failed = (content: Message, logger: Logger) => {
  const message = `${colors.red('✖')} ${stringifyMessage(content)}`
  info(message, logger)
}

/**
 * Performs a task with the title kept up to date and stdout available to the
 * task while it runs (there is no re-writing stdout while the task runs).
 */
export interface TaskOptions {
  title: string
  task: () => Promise<void | {successMessage: string}>
}
export const task = async ({title, task}: TaskOptions) => {
  let success
  started(title, logUpdate)
  try {
    const result = await task()
    success = result?.successMessage || title
  } catch (err) {
    failed(title, logUpdate)
    logUpdate.done()
    throw err
  }
  completed(success, logUpdate)
  logUpdate.done()
}
export const prompt = async <
  TName extends string & keyof TAnswers,
  TAnswers extends {[key in TName]: string} = {[key in TName]: string},
>(
  questions: ReadonlyArray<Question<TName>>,
): Promise<TAnswers> => {
  if (!isTerminalInteractive() && questions.length !== 0) {
    throw new AbortError(content`
The CLI prompted in a non-interactive terminal with the following questions:
${token.json(questions)}
    `)
  }

  const value = {} as TAnswers
  for (const question of questions) {
    if (question.preface) {
      info(question.preface)
    }

    // eslint-disable-next-line no-await-in-loop
    value[question.name] = (await executorUI(question)) as TAnswers[TName]
  }
  return value
}

export async function nonEmptyDirectoryPrompt(directory: string) {
  if (await fileExists(directory)) {
    const options = [
      {name: 'No, don’t delete the files', value: 'abort'},
      {name: 'Yes, delete the files', value: 'overwrite'},
    ]

    const relativeDirectory = relativePath(process.cwd(), directory)

    const questions: Question<'value'> = {
      type: 'select',
      name: 'value',
      message: `${relativeDirectory} is not an empty directory. Do you want to delete the existing files and continue?`,
      choices: options,
    }

    const choice = await prompt([questions])

    if (choice.value === 'abort') {
      throw new CancelExecution()
    }

    await removeFile(directory)
  }
}

export async function terminateBlockingPortProcessPrompt(port: number, stepDescription?: string): Promise<boolean> {
  const stepDescriptionContent = stepDescription ?? 'current step'

  const processInfo = await findProcess('port', port)
  const formattedProcessName =
    processInfo && processInfo.length > 0 && processInfo[0]?.name
      ? ` ${content`${token.italic(`(${processInfo[0].name})`)}`.value}`
      : ''

  const options = [
    {name: 'Yes, terminate process in order to log in now', value: 'finish'},
    {name: `No, cancel command and try later`, value: 'cancel'},
  ]

  const choice = await prompt([
    {
      type: 'select',
      name: 'value',
      message: `${stepDescriptionContent} requires a port ${port} that's unavailable because it's running another process${formattedProcessName}. Terminate that process? `,
      choices: options,
    },
  ])
  return choice.value === 'finish'
}

export const keypress = async (key?: string) => {
  return new Promise((resolve, reject) => {
    const disableRawMode = () => {}

    const handler = (data: string) => {
      if (data === '\u0003') {
        disableRawMode()
        debug('Canceled keypress, User pressed CTRL+C')
        reject(new AbortSilentError())
        return
      }

      if (key) {
        if (data === key) {
          process.nextTick(resolve)
        } else {
          return
        }
      } else {
        process.nextTick(resolve)
      }

      process.stdin.pause()
      process.stdin.setRawMode(false)
    }

    process.stdin.resume()
    process.stdin.setRawMode(true)
    process.stdin.on('data', handler)
  })
}
