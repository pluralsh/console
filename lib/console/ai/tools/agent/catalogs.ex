defmodule Console.AI.Tools.Agent.Catalogs do
  use Console.AI.Tools.Agent.Base
  alias Console.Repo
  alias Console.Schema.Catalog

  embedded_schema do
  end

  def changeset(model, attrs) do
    model
    |> cast(attrs, [])
  end

  @json_schema Console.priv_file!("tools/agent/catalogs.json") |> Jason.decode!()
  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("catalogs")
  def description(), do: "Returns a list of catalogs that are available to the user.  These collect PR automations that individually provision infrastructure a user might want to create, and are organized by theme."

  def implement(_) do
    Catalog.ordered()
    |> Repo.all()
    |> Enum.map(&Map.take(&1, [:id, :name, :description, :category]))
    |> Jason.encode()
  end
end
