defmodule Console.AI.Tools.Workbench.Observability.Plrl.Metrics do
  use Console.AI.Tools.Workbench.Base
  alias Console.Deployments.Settings
  alias Console.Schema.DeploymentSettings
  alias Console.AI.Tools.Workbench.Observability.{TimeRange, Metrics}
  alias Toolquery.{ToolConnection, PrometheusConnection}

  embedded_schema do
    field :query, :string
    field :step,  :string

    embeds_one :time_range, TimeRange, on_replace: :update
  end

  @valid ~w(query step)a

  def json_schema(), do: Console.priv_file!("tools/workbench/observability/metrics.json") |> Jason.decode!()
  def name(), do: "plrl_metrics"
  def description(), do: "Gather metrics from the (prometheus-compatible) Plural observability connection"

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:time_range)
    |> validate_required([:query])
  end

  def implement(%__MODULE__{query: q, step: s, time_range: tr}) do
    with {:ok, conn} <- build_tool_connection() do
      metrics = %Metrics{tool: conn, query: q, step: s, time_range: tr}
      Metrics.implement(metrics, metrics)
    end
  end

  def structured(%__MODULE__{query: q, step: s, time_range: tr}) do
    with {:ok, conn} <- build_tool_connection() do
      metrics = %Metrics{tool: conn, query: q, step: s, time_range: tr}
      Metrics.structured(metrics)
    end
  end

  def build_tool_connection() do
    case Settings.fetch() do
      %DeploymentSettings{prometheus_connection: %{url: url, user: user, password: pass}}
          when is_binary(url) and is_binary(user) and is_binary(pass) ->
        {:ok, %ToolConnection{connection: {:prometheus, %PrometheusConnection{url: url, username: user, password: pass}}}}
      _ ->
        {:error, "No prometheus connection configured in Plural's DeploymentSettings"}
    end
  end
end
