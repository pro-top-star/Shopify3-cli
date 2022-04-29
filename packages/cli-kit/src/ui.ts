// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {AutoComplete} from './ui/autocomplete'
import {Input} from './ui/input'
import {Select} from './ui/select'

export {Listr} from 'listr2'
export type {ListrTaskWrapper, ListrDefaultRenderer, ListrTask} from 'listr2'

export interface Question {
  type: 'input' | 'select' | 'autocomplete'
  name: string
  message: string
  validate?: (value: string) => string | boolean
  default?: string
  choices?: string[] | {name: string; value: string}[]
  result?: (value: string) => string | boolean
}

export const prompt = async <T>(questions: Question[]): Promise<T> => {
  const mappedQuestions: any = questions.map(mapper)
  const value: any = {}
  for (const question of mappedQuestions) {
    // eslint-disable-next-line no-await-in-loop
    value[question.name] = await question.run()
  }
  return value
}

function mapper(question: Question): any {
  if (question.type === 'input') {
    return new Input(question)
  } else if (question.type === 'select') {
    return new Select(question)
  } else if (question.type === 'autocomplete') {
    return new AutoComplete(question)
  }
  return undefined
}
