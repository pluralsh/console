defmodule Console.AI.Tools.Workbench.SelfService.CatalogSearch do
  use Console.AI.Tools.Workbench.Base
  alias Console.Repo
  alias Console.AI.Tool
  alias Console.Deployments.{Git, Policies}
  alias Console.Schema.{Catalog, PrAutomation}

  embedded_schema do
    field :query, :string
  end

  @valid ~w(query)a
  @json_schema Console.priv_file!("tools/workbench/self_service/catalog_search.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: "workbench_catalog_search"
  def description(), do: """
  Search Plural catalogs and PR automations that are available to the current user.
  Prefer this when you need a relevant golden path but do not yet know which catalog or automation fits.
  Falls back to name search when semantic search is unavailable.
  """

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:query])
  end

  def implement(%__MODULE__{query: query}) do
    case Tool.actor() do
      %{} = user ->
        case Git.catalog_search(query, user: user) do
          {:ok, results} -> format_results(results)
          {:error, _} -> fallback_search(query, user)
        end
      _ ->
        {:ok, "not logged in"}
    end
  end

  defp fallback_search(query, user) do
    catalogs =
      Catalog.search(query)
      |> Catalog.for_user(user)
      |> Repo.all()
      |> Enum.map(&%{catalog: Map.take(&1, [:id, :name, :description, :category])})

    pr_automations =
      PrAutomation.search(query)
      |> Repo.all()
      |> Repo.preload([:catalog])
      |> Enum.filter(&readable?(&1, user))
      |> Enum.map(fn pra ->
        %{
          pr_automation: Map.take(pra, [:id, :name, :documentation, :title, :branch])
          |> Map.put(:description, pra.documentation)
          |> Map.put(:catalog, pra.catalog && Map.take(pra.catalog, [:id, :name]))
        }
      end)

    Jason.encode(catalogs ++ pr_automations)
  end

  defp readable?(%PrAutomation{catalog: %Catalog{} = catalog}, user),
    do: match?({:ok, _}, Policies.allow(catalog, user, :read))
  defp readable?(%PrAutomation{} = pra, user),
    do: match?({:ok, _}, Policies.allow(pra, user, :create))

  defp format_results(results) do
    Enum.map(results, fn
      %{catalog: %Catalog{} = catalog} ->
        %{catalog: Map.take(catalog, [:id, :name, :description, :category])}
      %{pr_automation: %PrAutomation{} = pra} ->
        %{
          pr_automation:
            Map.take(pra, [:id, :name, :documentation, :title, :branch])
            |> Map.put(:description, pra.documentation)
        }
      other ->
        other
    end)
    |> Jason.encode()
  end
end
