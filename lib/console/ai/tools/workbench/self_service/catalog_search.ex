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
    with {:actor, %{} = user} <- {:actor, Tool.actor()},
         {:search, ^user, {:ok, results}} <- {:search, user, Git.catalog_search(query, user: user, count: 100)} do
      format_results(results)
    else
      {:actor, _} ->
        {:ok, "not logged in"}
      {:search, user, {:error, _}} ->
        fallback_search(query, user)
    end
  end

  defp fallback_search(query, user) do
    catalog_hits(query, user)
    |> Stream.concat(automation_hits(query, user))
    |> Enum.to_list()
    |> Jason.encode()
  end

  defp catalog_hits(query, user) do
    Catalog.search(query)
    |> Catalog.for_user(user)
    |> Catalog.with_limit(100)
    |> Repo.all()
    |> Stream.map(&%{catalog: Map.take(&1, [:id, :name, :description, :category])})
  end

  defp automation_hits(query, user) do
    PrAutomation.search(query)
    |> PrAutomation.with_limit(100)
    |> Repo.all()
    |> Repo.preload([:catalog])
    |> Stream.filter(&readable?(&1, user))
    |> Stream.map(fn pra ->
      %{
        pr_automation: Map.take(pra, [:id, :name, :documentation, :title, :branch])
        |> Map.put(:description, pra.documentation)
        |> Map.put(:catalog, pra.catalog && Map.take(pra.catalog, [:id, :name]))
      }
    end)
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
