defmodule Console.AI.Tools.Services do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils
  alias Console.Repo
  alias Console.AI.Tool
  alias Console.Schema.{Flow, Service, Cluster}

  embedded_schema do
    field :query,   :string
    field :cluster, :string
  end

  @valid ~w(query cluster)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/services.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: "__plrl__:services"
  def description(), do: "Searches the service currently being deployed into this flow"

  def implement(%__MODULE__{} = query) do
    case Tool.flow() do
      %Flow{id: flow_id} = flow ->
        services = Service.for_flow(flow_id)
                   |> Repo.all()
                   |> Repo.preload([:cluster])
                   |> maybe_search(query)
        {:ok, tool_content(:services, %{services: services, flow: flow})}
      _ -> {:error, "no flow found"}
    end
  end

  defp maybe_search(services, %__MODULE__{query: q, cluster: c}) do
    services
    |> Enum.filter(&filter_query(&1, q))
    |> Enum.filter(&filter_cluster(&1, c))
  end

  defp filter_query(%Service{name: n}, q) when is_binary(q),
    do: String.contains?(n, q)
  defp filter_query(_, _), do: true

  defp filter_cluster(%Service{cluster: %Cluster{handle: h}}, c) when is_binary(c),
    do: String.contains?(h, c)
  defp filter_cluster(_, _), do: true
end
