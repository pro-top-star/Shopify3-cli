import {gql} from 'graphql-request'

export const CreateAppQuery = gql`
  mutation AppCreate($org: Int!, $title: String!, $appUrl: Url!, $redir: [Url]!) {
    appCreate(input: {organizationID: $org, title: $title, applicationUrl: $appUrl, redirectUrlWhitelist: $redir}) {
      app {
        id
        apiKey
        title
        applicationUrl
        redirectUrlWhitelist
        apiSecretKeys {
          secret
        }
        appType
      }
      userErrors {
        field
        message
      }
    }
  }
`

export interface CreateAppQueryVariables {
  org: number
  title: string
  appUrl: string
  redir: string[]
}

export interface CreateAppQuerySchema {
  appCreate: {
    app: {
      id: string
      apiKey: string
      title: string
      applicationUrl: string
      redirectUrlWhitelist: string[]
      apiSecretKeys: {
        secret: string
      }[]
      appType: string
    }
    userErrors: {
      field: string[]
      message: string
    }[]
  }
}
