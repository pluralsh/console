defmodule Console.AI.Tools.Agent.PrAutomations do
  use Console.AI.Tools.Agent.Base
  alias Console.Repo
  alias Console.Schema.PrAutomation

  embedded_schema do
    field :catalog_id, :string
  end

  @valid ~w(catalog_id)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:catalog_id])
  end

  def json_schema(), do: Console.priv_file!("tools/agent/automations.json") |> Jason.decode!()
  def name(), do: plrl_tool("pr_automations")
  def description(), do: "Returns a list of pr automations that are present in this catalog.  These are individual PRs that provision infrastructure a user might want to create in a tested, gitops fashion."

  def implement(%__MODULE__{catalog_id: catalog_id}) do
    PrAutomation.for_catalog(catalog_id)
    |> Repo.all()
    |> Enum.map(&Map.take(&1, [:id, :name, :description, :title]))
    |> Jason.encode()
  end
end
