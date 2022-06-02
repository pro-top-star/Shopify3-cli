import {gql} from 'graphql-request'

export interface AllOrganizationsQuerySchema {
  organizations: {
    nodes: {
      id: string
      businessName: string
      website: string
      appsNext: boolean
    }[]
  }
}

export const AllOrganizationsQuery = gql`
  {
    organizations(first: 200) {
      nodes {
        id
        businessName
        website
        appsNext
      }
    }
  }
`
