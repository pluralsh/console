defmodule Console.AI.Tools.Alerts do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils
  alias Console.Schema.{Alert, Flow}

  embedded_schema do
    field :severities, {:array, :string}
    field :state,      :string
    field :types,       {:array, :string}
  end

  @valid ~w(severities state types)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/alerts.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("alerts")
  def description(), do: "Shows alerts for the current flow, with optional filtering by severity, state, and type."

  def implement(%__MODULE__{severities: severities, state: state, types: types}) do
    case Console.AI.Tool.flow() do
      %Flow{id: flow_id} ->
        Alert.for_flow(flow_id)
        |> apply_filters(%{severities: severities, state: state, types: types})
        |> Alert.distinct()
        |> Console.Repo.all()
        |> model()
        |> Jason.encode()
      nil ->
        {:error, "no flow found"}
    end
  end

  defp apply_filters(query, filters) do
    Enum.reduce(filters, query, fn
      {:severities, severities}, q -> Alert.for_severities(q, severities)
      {:state, state}, q -> Alert.for_state(q, state)
      {:types, types}, q -> Alert.for_types(q, types)
      _, q -> q
    end)
  end

  defp model(alerts) do
    Enum.map(alerts, &Map.take(&1, ~w(type severity state title url message annotations project_id cluster_id service_id)a))
  end
end
