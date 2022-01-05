import { gql } from 'apollo-boost'
import { ConfigurationOverlayFragment, LogFilterFragment } from './kubernetes';
import { PageInfo } from './base'
import { BuildFragment } from './builds';

export const RepositoryFragment = gql`
  fragment RepositoryFragment on Repository {
    id
    name
    description
    icon
  }
`;

export const InstallationFragment = gql`
  fragment InstallationFragment on Installation {
    id
    repository {
      ...RepositoryFragment
    }
  }
  ${RepositoryFragment}
`;

export const RecipeFragment = gql`
  fragment RecipeFragment on Recipe {
    id
    name
    description
    provider
    oidcEnabled
  }
`

export const ConfigurationItemFragment = gql`
  fragment ConfigurationItemFragment on ConfigurationItem {
    name 
    default 
    documentation 
    type 
    placeholder 
    condition { operation field value }
  }
`;

export const RecipeSectionFragment = gql`
  fragment RecipeSectionFragment on RecipeSection {
    id
    repository { ...RepositoryFragment }
    configuration { ...ConfigurationItemFragment }
    recipeItems {
      id
      configuration { ...ConfigurationItemFragment }
    }
  }
  ${ConfigurationItemFragment}
  ${RepositoryFragment}
`

export const SEARCH_REPOS = gql`
  query Search($query: String!) {
    repositories(query: $query, first: 20) {
      pageInfo { ...PageInfo }
      edges { node { ...RepositoryFragment } }
    }
  }
  ${PageInfo}
  ${RepositoryFragment}
`

export const RECIPES_Q = gql`
  query Recipes($id: ID!, $cursor: String) {
    recipes(id: $id, after: $cursor, first: 20) {
      pageInfo { ...PageInfo }
      edges { node { ...RecipeFragment } }
    }
  }
  ${PageInfo}
  ${RecipeFragment}
`

export const RECIPE_Q = gql`
  query Recipe($id: ID!) {
    recipe(id: $id) {
      ...RecipeFragment
      recipeSections { ...RecipeSectionFragment }
    }
    context {
      repository
      context
    }
  }
  ${RecipeFragment}
  ${RecipeSectionFragment}
`

export const INSTALL_RECIPE = gql`
  mutation Install($id: ID!, $context: Map!, $oidc: Boolean) {
    installRecipe(id: $id, context: $context, oidc: $oidc) {
      ...BuildFragment
    }
  }
  ${BuildFragment}
`

export const INSTALLATION_Q = gql`
  query Installations($cursor: String) {
    installations(first: 20, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          ...InstallationFragment
        }
      }
    }
  }
  ${InstallationFragment}
`;

export const CONFIGURATIONS_Q = gql`
  query Installations($cursor: String) {
    installations(first: 20, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          repository {
            ...RepositoryFragment
            configuration
            grafanaDns
          }
        }
      }
    }
  }
  ${RepositoryFragment}
`;

export const CostAnalysisFragment = gql`
  fragment CostAnalysisFragment on CostAnalysis {
    minutes
    cpuCost
    pvCost
    ramCost
    totalCost
  }
`

export const LicenseFragment = gql`
  fragment LicenseFragment on License {
    metadata { name }
    status { 
      free
      features { name description }
      limits
      plan
    }
  }
`

export const ApplicationFragment = gql`
  fragment ApplicationFragment on Application {
    name
    spec {
      descriptor {
        type
        icons
        description
        version
        links { description url }
      }
      components { group kind }
    }
    status {
      components {
        group
        kind
        name
        status
      }
      conditions {
        message
        reason
        status
        type
      }
      componentsReady
    }
    cost { ...CostAnalysisFragment }
  }
  ${CostAnalysisFragment}
`

export const UPDATE_CONFIGURATION = gql`
  mutation UpdateConfiguration($repository: String!, $content: String!, $type: Tool) {
    updateConfiguration(repository: $repository, content: $content, tool: $type) {
      helm
      terraform
    }
  }
`;

export const APPLICATIONS_Q = gql`
  query {
    applications {
      ...ApplicationFragment
      license { ...LicenseFragment }
    }
  }
  ${ApplicationFragment}
  ${LicenseFragment}
`;

export const APPLICATION_Q = gql`
  query App($name: String!) {
    application(name: $name) {
      configuration { helm terraform }
      ...ApplicationFragment
    }
    configurationOverlays(namespace: $name) {
      ...ConfigurationOverlayFragment
    }
  }
  ${ApplicationFragment}
  ${ConfigurationOverlayFragment}
`

export const APPLICATION_SUB = gql`
  subscription {
    applicationDelta {
      delta
      payload {
        ...ApplicationFragment
      }
    }
  }
  ${ApplicationFragment}
`;

export const LOG_FILTER_Q = gql`
  query LogFilters($namespace: String!) {
    logFilters(namespace: $namespace) {
      ...LogFilterFragment
    }
  }
  ${LogFilterFragment}
`;