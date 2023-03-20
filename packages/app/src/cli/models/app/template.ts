import {GenericSpecification} from './extensions.js'
import {extensionTypesGroups} from '../../constants.js'

export interface TemplateSpecification {
  identifier: string
  name: string
  group: string
  supportLinks: string[]
  types: GenericSpecification[]
}

export function convertSpecificationsToTemplate(specifications: GenericSpecification[]): TemplateSpecification[] {
  return specifications.map((spec) => {
    return {
      identifier: spec.identifier,
      name: spec.externalName,
      group: spec.group || extensionTypesGroups.find((group) => group.extensions.includes(spec.identifier))?.name || '',
      supportLinks: spec.helpURL ? [spec.helpURL] : [],
      types: [spec],
    }
  })
}

export function getTypesExternalIdentitifier(templates: TemplateSpecification[]): string[] {
  return templates.flatMap((template) => template.types.map((type) => type.externalIdentifier))
}

export function getTypesExternalName(templates: TemplateSpecification[]): string[] {
  return templates.flatMap((template) => template.types.map((type) => type.externalName))
}
