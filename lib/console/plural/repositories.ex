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
    ConfigurationItem,
    Workspace,
    Condition
  }

  defmodule Query do
    defstruct [:installations, :searchRepositories, :recipes, :recipe]
  end

  defmodule Mutation do
    defstruct [:installRecipe]
  end

  def search_repositories(query, first) do
    search_repositories_query()
    |> Client.run(
      prune_variables(%{query: query, first: first}),
      %Query{searchRepositories: %Connection{
        pageInfo: %PageInfo{},
        edges: [%Edge{node: %Repository{}}]
      }}
    )
    |> when_ok(fn %{searchRepositories: result} -> result end)
  end

  def list_recipes(id, cursor) do
    prov = Workspace.provider()
    list_recipes_query()
    |> Client.run(
      prune_variables(%{id: id, cursor: cursor, provider: provider(prov)}),
      %Query{recipes: %Connection{
        pageInfo: %PageInfo{},
        edges: [%Edge{node: %Recipe{}}]
      }}
    )
    |> when_ok(fn %{recipes: result} -> result end)
  end

  defp provider(:gcp), do: "GCP"
  defp provider(:azure), do: "AZURE"
  defp provider(_), do: "AWS"

  def get_recipe(id) do
    get_recipe_query()
    |> Client.run(
      prune_variables(%{id: id}),
      %Query{recipe: %Recipe{
        repository: %Repository{},
        recipeSections: [%RecipeSection{
          repository: %Repository{},
          recipeItems: [%RecipeItem{
            configuration: [%ConfigurationItem{
              condition: %Condition{}
            }]
          }]
        }]
      }}
    )
    |> when_ok(fn %{recipe: result} -> result end)
  end

  def install_recipe(id) do
    install_recipe_mutation()
    |> Client.run(
      prune_variables(%{id: id, ctx: "{}"}),
      %Mutation{}
    )
  end

  def list_installations(first, cursor) do
    installation_query()
    |> Client.run(
      prune_variables(%{cursor: cursor, first: first}),
      %Query{installations: %Connection{
        pageInfo: %PageInfo{},
        edges: [
          %Edge{
            node: %Installation{
              repository: %Repository{dashboards: [%Dashboard{}]}
            }
          }
        ]
      }}
    )
    |> when_ok(fn %{installations: result} -> result end)
  end
end
