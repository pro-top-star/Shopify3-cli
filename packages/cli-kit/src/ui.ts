// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {AutoComplete} from './ui/autocomplete'
import {Input} from './ui/input'
import {Select} from './ui/select'
import {AbortSilent} from './error'
import {remove, exists} from './file'
import {info} from './output'
import {relative} from './path'

export {Listr} from 'listr2'
export type {ListrTaskWrapper, ListrDefaultRenderer, ListrTask} from 'listr2'

export interface Question {
  type: 'input' | 'select' | 'autocomplete' | 'password'
  name: string
  message: string
  validate?: (value: string) => string | boolean
  default?: string
  preface?: string
  choices?: string[] | {name: string; value: string}[]
  result?: (value: string) => string | boolean
}

export const prompt = async <T>(questions: Question[]): Promise<T> => {
  const mappedQuestions: any = questions.map(mapper)
  const value: any = {}
  for (const question of mappedQuestions) {
    if (question.preface) {
      info(question.preface)
    }
    // eslint-disable-next-line no-await-in-loop
    value[question.name] = await question.run()
  }
  return value
}

export async function nonEmptyDirectoryPrompt(directory: string) {
  if (await exists(directory)) {
    const options = [
      {name: 'Yes, remove the files', value: 'overwrite'},
      {name: 'No, abort the command', value: 'abort'},
    ]

    const relativeDirectory = relative(process.cwd(), directory)

    const questions: Question = {
      type: 'select',
      name: 'value',
      message: `${relativeDirectory} is not an empty directory. Do you want to remove the existing files and continue?`,
      choices: options,
    }

    const choice: {value: string} = await prompt([questions])

    if (choice.value === 'abort') {
      throw new AbortSilent()
    }

    remove(directory)
  }
}

function mapper(question: Question): any {
  switch (question.type) {
    case 'input':
    case 'password':
      return new Input(question)
    case 'select':
      return new Select(question)
    case 'autocomplete':
      return new AutoComplete(question)
    default:
      return undefined
  }
}
