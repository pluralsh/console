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
    Workspace,
    OIDCProvider,
    Stack,
    Doc
  }

  defmodule Query do
    defstruct [:installations, :repositories, :recipes, :recipe, :installation, :stack, :repository]
  end

  defmodule Mutation do
    defstruct [:installRecipe, :upsertOidcProvider, :installStack]
  end

  def repository(name) do
    repository_query()
    |> Client.run(%{name: name}, %Query{repository: %Repository{docs: [%Doc{}]}})
    |> when_ok(fn %{repository: repo} -> repo end)
  end

  def search_repositories(query, first, cursor \\ nil) do
    search_repositories_query()
    |> Client.run(
      prune_variables(%{query: query, first: first, cursor: cursor}),
      %Query{repositories: %Connection{
        pageInfo: %PageInfo{},
        edges: [%Edge{node: %Repository{}}]
      }}
    )
    |> when_ok(fn %{repositories: result} -> result end)
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
  defp provider(:equinix), do: "EQUINIX"
  defp provider(_), do: "AWS"

  def get_recipe(id) do
    get_recipe_query()
    |> Client.run(
      prune_variables(%{id: id}),
      %Query{recipe: Recipe.spec()}
    )
    |> when_ok(fn %{recipe: result} -> result end)
  end

  def get_stack(name) do
    prov = Workspace.provider()
    get_stack_query()
    |> Client.run(%{name: name, provider: provider(prov)}, %Query{stack: Stack.spec()})
    |> when_ok(fn %{stack: s} -> s end)
  end

  def install_stack(name) do
    prov = Workspace.provider()
    install_stack_mutation()
    |> Client.run(%{name: name, provider: provider(prov)}, %Mutation{installStack: [Recipe.spec()]})
    |> when_ok(fn %{installStack: recipes} -> recipes end)
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

  def get_installation(name) do
    get_installation_query()
    |> Client.run(%{name: name}, %Query{installation: %Installation{
      oidcProvider: OIDCProvider.spec()
    }})
    |> when_ok(fn %{installation: inst} -> inst end)
  end

  def upsert_oidc_provider(id, attrs) do
    upsert_oidc_provider()
    |> Client.run(%{id: id, attributes: attrs}, %Mutation{})
    |> when_ok(fn %{upsertOidcProvider: prov} -> prov end)
  end
end
