defmodule Console.AI.Tools.Alerts do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils
  alias Console.Repo
  alias Console.Schema.{
    Alert,
    Flow,
    ObservabilityWebhook
  }

  embedded_schema do
    field :severities, {:array, Alert.Severity}
    field :state,      Alert.State
    field :types,      {:array, ObservabilityWebhook.Type}
  end

  @valid ~w(severities state types)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/alerts.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("alerts")
  def description(), do: "Shows recent alerts associated with this chat.  These will describe active or recent infrastructure and application issues that were detected."

  def implement(%__MODULE__{} = mod) do
    case Console.AI.Tool.flow() do
      %Flow{id: flow_id} ->
        Alert.for_flow(flow_id)
        |> apply_filters(mod)
        |> Alert.distinct()
        |> Repo.all()
        |> Repo.preload([:cluster, :service])
        |> model()
        |> Jason.encode()
      nil ->
        {:error, "no flow found"}
    end
  end

  defp apply_filters(query, mod) do
    Map.from_struct(mod)
    |> Enum.reduce(query, fn
      {:severities, [_| _] = severities}, q -> Alert.for_severities(q, severities)
      {:state, state}, q when state in ~w(firing resolved)a -> Alert.for_state(q, state)
      {:types, [_| _] = types}, q -> Alert.for_types(q, types)
      _, q -> q
    end)
  end

  defp model(alerts) when is_list(alerts) do
    Enum.map(alerts, &model/1)
    |> Enum.filter(& &1)
  end

  defp model(%Alert{} = model) do
    Map.take(model, ~w(type severity state title url message annotations)a)
    |> Map.put(:service_deployment, Console.deep_get(model, [:service, :name]))
    |> Map.put(:cluster, Console.deep_get(model, [:cluster, :handle]))
  end
  defp model(_), do: nil
end
