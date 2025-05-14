defmodule Console.AI.Tools.Alerts do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils
  alias Console.Repo
  alias Console.Schema.{Alert, AlertRule}

  embedded_schema do
    field :query, :string
  end

  @valid ~w(query)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/alerts.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("alerts")
  def description(), do: "Shows the alerts currently associated with this flow. This can be a source of truth for the stage of the Plural service deployments in the flow as well."

  def implement(%__MODULE__{} = _query) do
    case Console.AI.Tool.flow() do
      {:flow, %Flow{id: flow_id}} ->
        actual_alerts =
          Console.Schema.Alert.for_flow(flow_id)
          |> Console.Repo.all()

        model(actual_alerts)
        |> Jason.encode()

      _ ->
        {:error, "no flow found"}
    end
  end

  defp model(alerts) do
    Enum.map(alerts, fn alert ->
      %{
        type: alert.type,
        severity: alert.severity,
        state: alert.state,
        title: alert.title,
        message: alert.message,
        annotations: alert.annotations
      }
    end)
  end
end
