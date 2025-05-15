defmodule Console.AI.Tools.Alerts do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils
  alias Console.Schema.{Alert, Flow}

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

  def implement(%__MODULE__{} = args) do
    IO.inspect(args, label: "args")
    case Console.AI.Tool.flow() do
      %Flow{id: flow_id} ->
        Alert.for_flow(Alert, flow_id)
        |> Console.Repo.all()
        |> model()
        |> Jason.encode()
      nil ->
        {:error, "no flow found"}
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
        url: alert.url,
        message: alert.message,
        annotations: alert.annotations,
        project_id: alert.project_id,
        cluster_id: alert.cluster_id,
        service_id: alert.service_id
      }
    end)
  end
end
