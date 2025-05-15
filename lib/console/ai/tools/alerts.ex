defmodule Console.AI.Tools.Alerts do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils
  alias Console.Schema.{Alert, Flow}
  # No VectorStore alias needed here
  # alias Console.AI.Tool # Will use Console.AI.Tool.flow() directly

  embedded_schema do
  end

  @valid ~w()a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/alerts.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("alerts")
  def description(), do: "Shows alerts for the current flow."

  def implement(%__MODULE__{}) do
    case Console.AI.Tool.flow() do # Get flow context
      %Flow{id: flow_id} ->
        alerts =
          Alert.for_flow(Alert, flow_id) # Use Alert module as base for query
          |> Console.Repo.all()
          |> IO.inspect(label: "alerts")

        model(alerts)
        |> Jason.encode()
      nil ->
        {:error, "no flow found"}
      _ ->
        # This case might occur if Tool.flow() returns something unexpected like %{user: ..., flow: nil}
        {:error, "Flow context not available or in unexpected format"}
    end
  end

  # This model function expects a list of Console.Schema.Alert structs
  defp model(alerts) do
    Enum.map(alerts, fn alert ->
      %{
        type: alert.type,
        severity: alert.severity,
        state: alert.state,
        title: alert.title,
        message: alert.message,
        annotations: alert.annotations
        # Add other fields if necessary, e.g., alert.id, alert.url
      }
    end)
  end
end
