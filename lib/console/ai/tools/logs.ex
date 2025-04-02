defmodule Console.AI.Tools.Logs do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils

  alias Console.Logs.{Provider, Query}
  alias Console.Schema.{Flow, Service}

  embedded_schema do
    field :query,   :string
    field :service, :string
    field :cluster, :string
  end

  @valid ~w(service cluster query)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid -- [:query])
  end

  @json_schema Console.priv_file!("tools/logs.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("logs")
  def description(), do: "Lists logs for a given service and cluster"

  def implement(%__MODULE__{service: service, cluster: cluster, query: query}) do
    with {:flow, %Flow{id: flow_id} = flow} <- {:flow, Console.AI.Tool.flow()},
         {:svc, %Service{} = svc} <- {:svc, get_service(flow_id, service, cluster)},
         {:ok, logs} <- Provider.query(%Query{query: query, resource: svc, limit: 20}) do
      {:ok, tool_content(:logs, %{service: svc, logs: logs, flow: flow})}
    else
      {:flow, _} -> {:error, "no flow found"}
      {:svc, _} -> {:error, "no service found matching service=#{service} and cluster=#{cluster}"}
      _ -> {:error, "internal error fetching logs data"}
    end
  end
end
