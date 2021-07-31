defmodule Console.Plural.Repositories do
  use Console.Plural.Base
  alias Console.Plural.{
    Connection,
    Edge,
    PageInfo,
    Installation,
    Repository,
    Dashboard,
    Recipe,
    RecipeSection,
    RecipeItem,
    ConfigurationItem
  }

  defmodule Query do
    defstruct [:installations, :searchRepositories, :recipes, :recipe]
  end

  def search_repositories(query) do
    search_repositories_query()
    |> Client.run(
      prune_variables(%{query: query}),
      %Query{searchRepositories: %Connection{
        pageInfo: %PageInfo{},
        edges: [%Edge{node: %Repository{}}]
      }}
    )
    |> when_ok(fn %{searchRepositories: result} -> result end)
  end

  def list_recipes(id, cursor) do
    list_recipes_query()
    |> Client.run(
      prune_variables(%{id: id, cursor: cursor}),
      %Query{recipes: %Connection{
        pageInfo: %PageInfo{},
        edges: [%Edge{node: %Recipe{}}]
      }}
    )
    |> when_ok(fn %{recipes: result} -> result end)
  end

  def get_recipe(id) do
    get_recipe_query()
    |> Client.run(
      prune_variables(%{id: id}),
      %Query{recipe: %Recipe{
        recipeSections: [%RecipeSection{
          repository: %Repository{},
          recipeItems: [%RecipeItem{
            configuration: [%ConfigurationItem{}]
          }]
        }]
      }}
    )
    |> when_ok(fn %{recipe: result} -> result end)
  end

  def list_installations(first, cursor) do
    installation_query()
    |> Client.run(
      prune_variables(%{cursor: cursor, first: first}),
      %Query{installations: %Connection{
        pageInfo: %PageInfo{},
        edges: [
          %Edge{node: %Installation{
            repository: %Repository{dashboards: [%Dashboard{}]}
          }
        }]
      }}
    )
    |> when_ok(fn %{installations: result} -> result end)
  end
end
