import {ui} from '@shopify/cli-kit'
import {ExtensionRegistration} from '../dev/create-extension.js'
import {LocalExtension} from './id-matching.js'
import {RemoteRegistration} from './identifiers.js'

export async function matchConfirmationPrompt(extension: LocalExtension, registration: ExtensionRegistration) {
  const choices = [
    {name: `Yes, that's right`, value: 'yes'},
    {name: `No, cancel deployment`, value: 'no'},
  ]
  const choice: {value: string} = await ui.prompt([
    {
      type: 'select',
      name: 'value',
      message: `Deploy ${extension.configuration.name} (local name) as ${registration.title} (name on Shopify Partners, ID: ${registration.id})?`,
      choices,
    },
  ])
  return choice.value === 'yes'
}

export async function selectRegistrationPrompt(
  extension: LocalExtension,
  registrations: RemoteRegistration[],
  registrationIdField: 'id' | 'uuid',
): Promise<RemoteRegistration> {
  const registrationList = registrations.map((reg) => ({
    name: `Match it to ${reg.title} (ID: ${reg.id} on Shopify Partners)`,
    value: reg[registrationIdField],
  }))
  registrationList.push({name: 'Create new extension', value: 'create'})
  const choice: {uuid: string} = await ui.prompt([
    {
      type: 'autocomplete',
      name: 'uuid',
      message: `How would you like to deploy your "${extension.configuration.name}"?`,
      choices: registrationList,
    },
  ])
  return registrations.find((reg) => reg[registrationIdField] === choice.uuid)!
}
