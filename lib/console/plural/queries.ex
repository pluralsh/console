defmodule Console.Plural.Queries do
  @page_info """
    fragment PageInfo on PageInfo {
      end_cursor
      has_next_page
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
      me { id }
    }
  """

  @create_queue """
    mutation Create($attributes: UpgradeQueueAttributes!) {
      createQueue(attributes: $attributes) { id }
    }
  """

  @search_repositories """
    query SearchRepos($query: String!) {
      searchRepositories(query: $query, first: 10) {
        pageInfo { ...PageInfo }
        edges { node { ...RepositoryFragment } }
      }
    }
    #{@page_info}
    #{@repository_fragment}
  """

  @list_recipes """
    query Recipes($id: ID!, $cursor: String) {
      recipes(repositoryId: $id, first: 20, after: $cursor) {
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
        recipeSections { ...RecipeSectionFragment }
      }
    }
    #{@recipe_fragment}
    #{@recipe_section_fragment}
  """

  def installation_query(), do: @installation_query

  def external_token_mutation(), do: "mutation { externalToken }"

  def incident_message_subscription(), do: @incident_message_sub

  def create_message_mutation(), do: @create_message

  def create_queue_mutation(), do: @create_queue

  def me_query(), do: @me_query

  def search_repositories_query(), do: @search_repositories

  def list_recipes_query(), do: @list_recipes

  def get_recipe_query(), do: @get_recipe
end
