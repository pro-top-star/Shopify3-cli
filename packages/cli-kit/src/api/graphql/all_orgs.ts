import {gql} from 'graphql-request'

export interface AllOrganizationsQuerySchema {
  organizations: {
    nodes: {
      id: string
      businessName: string
      website: string
    }[]
  }
}

export const AllOrganizationsQuery = gql`
  {
    organizations {
      nodes {
        id
        businessName
        website
      }
    }
  }
`