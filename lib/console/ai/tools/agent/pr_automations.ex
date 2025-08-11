defmodule Console.AI.Tools.Agent.PrAutomations do
  use Console.AI.Tools.Agent.Base
  alias Console.Repo
  alias Console.Schema.{Catalog, PrAutomation}
  alias Console.Deployments.{Git, Policies}

  embedded_schema do
    field :catalog, :string
  end

  @valid ~w(catalog)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:catalog])
  end

  @fields ~w(id name description title configuration)a
  @json_schema Console.priv_file!("tools/agent/pr_automations.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("pr_automations")
  def description(), do: "Returns a list of pr automations that are present in this catalog.  These are individual PRs that provision infrastructure a user might want to create in a tested, gitops fashion."

  def implement(%__MODULE__{catalog: catalog}) do
    with %Catalog{id: id} = cat <- Git.get_catalog_by_name(catalog),
         {:ok, _} <- Policies.allow(cat, Tool.actor(), :read) do
      PrAutomation.for_catalog(id)
      |> Repo.all()
      |> Enum.map(fn pra ->
        Map.take(pra, @fields)
        |> Console.mapify()
      end)
      |> Jason.encode()
    else
      nil -> {:ok, "No catalog found with name #{catalog}"}
      {:error, _} -> {:ok, "You do not have access to the catalog #{catalog}"}
      err -> err
    end
  end
end
