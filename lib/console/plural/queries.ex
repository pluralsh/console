defmodule Console.Plural.Queries do
  @page_info """
    fragment PageInfo on PageInfo {
      endCursor
      hasNextPage
    }
  """

  @repository_fragment """
    fragment RepositoryFragment on Repository {
      id
      name
      icon
      description
    }
  """

  @recipe_item_fragment """
    fragment RecipeItemFragment on RecipeItem {
      id
      configuration {
        name
        type
        default
        placeholder
        documentation
        condition { operation field value }
      }
    }
  """

  @recipe_section_fragment """
    fragment RecipeSectionFragment on RecipeSection {
      id
      repository { ...RepositoryFragment }
      recipeItems { ...RecipeItemFragment }
    }
    #{@recipe_item_fragment}
    #{@repository_fragment}
  """

  @recipe_fragment """
    fragment RecipeFragment on Recipe {
      id
      name
      description
      provider
      oidcSettings {
        domainKey
        uriFormat
        authMethod
      }
    }
  """

  @incident_fragment """
    fragment IncidentFragment on Incident {
      id
      title
      description
      severity
      status
    }
  """

  @installation_fragment """
    fragment InstallationFragment on Installation {
      id
      repository { ...RepositoryFragment }
    }
    #{@repository_fragment}
  """

  @installation_query """
    query Installations($first: Int!, $cursor: String) {
      installations(first: $first, after: $cursor) {
        pageInfo { endCursor hasNextPage }
        edges {
          node { ...InstallationFragment }
        }
      }
    }
    #{@installation_fragment}
  """

  @get_installation_q """
    query Installation($name: String!) {
      installation(name: $name) {
        ...InstallationFragment
      }
    }
    #{@installation_fragment}
  """

  @incident_message_sub """
    subscription Incident($id: ID) {
      incidentMessageDelta(incidentId: $id) {
        delta
        payload { id text incident { id repository { name } } }
      }
    }
  """

  @create_message """
    mutation Create($incidentId: ID!, $attributes: IncidentMessageAttributes!) {
      createMessage(incidentId: $incidentId, attributes: $attributes) { id }
    }
  """

  @me_query """
    query {
      me { id email }
    }
  """

  @create_queue """
    mutation Create($attributes: UpgradeQueueAttributes!) {
      createQueue(attributes: $attributes) { id }
    }
  """

  @search_repositories """
    query SearchRepos($query: String!, $first: Int) {
      searchRepositories(query: $query, first: $first) {
        pageInfo { ...PageInfo }
        edges { node { ...RepositoryFragment } }
      }
    }
    #{@page_info}
    #{@repository_fragment}
  """

  @list_recipes """
    query Recipes($id: ID!, $cursor: String, $provider: Provider) {
      recipes(repositoryId: $id, first: 20, after: $cursor, provider: $provider) {
        pageInfo { ...PageInfo }
        edges { node { ...RecipeFragment } }
      }
    }
    #{@page_info}
    #{@recipe_fragment}
  """

  @get_recipe """
    query Recipe($id: ID!) {
      recipe(id: $id) {
        ...RecipeFragment
        repository { ...RepositoryFragment }
        recipeSections { ...RecipeSectionFragment }
      }
    }
    #{@repository_fragment}
    #{@recipe_fragment}
    #{@recipe_section_fragment}
  """

  @install_recipe """
    mutation Install($id: ID!, $ctx: Map!) {
      installRecipe(recipeId: $id, context: $ctx) {
        id
      }
    }
  """

  @oidc_upsert """
    mutation OIDC($id: ID!, $attributes: OidcProviderAttributes!) {
      upsertOidcProvider(installationId: $id, attributes: $attributes) {
        id
      }
    }
  """

  @get_incident """
    query Incident($id: ID!) {
      incident(id: $id) {
        ...IncidentFragment
      }
    }
    #{@incident_fragment}
  """

  @create_incident """
    mutation CreateIncident($repo: String, $attributes: IncidentAttributes!) {
      createIncident(repo: $repo, attributes: $attributes) {
        ...IncidentFragment
      }
    }
    #{@incident_fragment}
  """

  @update_incident """
    mutation UpdateIncident($id: ID!, $attributes: IncidentAttributes!) {
      updateIncident(id: $id, attributes: $attributes) {
        ...IncidentFragment
      }
    }
    #{@incident_fragment}
  """

  def installation_query(), do: @installation_query

  def get_installation_query(), do: @get_installation_q

  def external_token_mutation(), do: "mutation { externalToken }"

  def incident_message_subscription(), do: @incident_message_sub

  def create_message_mutation(), do: @create_message

  def create_queue_mutation(), do: @create_queue

  def me_query(), do: @me_query

  def search_repositories_query(), do: @search_repositories

  def list_recipes_query(), do: @list_recipes

  def get_recipe_query(), do: @get_recipe

  def install_recipe_mutation(), do: @install_recipe

  def upsert_oidc_provider(), do: @oidc_upsert

  def get_incident_query(), do: @get_incident

  def update_incident_mutation(), do: @update_incident

  def create_incident_mutation(), do: @create_incident
end
