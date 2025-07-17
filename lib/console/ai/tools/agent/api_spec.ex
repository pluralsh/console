defmodule Console.AI.Tools.Agent.ApiSpec do
  use Console.AI.Tools.Agent.Base
  alias Console.Schema.{Cluster}
  alias Console.Deployments.Clusters

  embedded_schema do
    field :group,   :string
    field :version, :string
    field :query,   :string
  end

  @json_schema Console.priv_file!("tools/agent/api_spec.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("api_spec")
  def description(), do: "Prints the openapi spec for a given kubernetes group and version, core versions not supported but are also fully well-known.  To find the exact group and version, use the api_discovery tool, this is especially useful when a user is looking to write a complex kubernetes manifest."

  @valid ~w(group version query)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:version, :query])
  end

  def implement(%__MODULE__{group: nil}), do: {:ok, "Core (null) groups are not supported, use the standard definition for its kubernetes kinds"}
  def implement(%__MODULE__{group: group, version: version, query: query}) do
    with {:session, %AgentSession{cluster: %Cluster{} = cluster}} <- session(),
         {:ok, %{"components" => %{"schemas" => schemas}}} <- Clusters.api_spec(cluster, group, version) do
      Enum.sort_by(schemas, fn {k, _} -> String.jaro_distance(k, query) end, :desc)
      |> Enum.take(5)
      |> Map.new()
      |> Jason.encode()
    else
      {:session, _} -> {:error, "No cluster bound to this session"}
      err -> err
    end
  end
end
