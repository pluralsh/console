defmodule Console.AI.Tools.Agent.Discovery do
  use Console.AI.Tools.Agent.Base
  alias Console.Schema.{Cluster}
  alias Console.Deployments.Clusters

  embedded_schema do
  end

  @json_schema Console.priv_file!("tools/agent/discovery.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("api_discovery")
  def description(), do: "Prints the api discovery information for the current cluster, listing all groups versions and kinds available."

  @valid ~w()a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  def implement(%__MODULE__{}) do
    with {:session, %AgentSession{cluster: %Cluster{} = cluster}} <- session(),
         {:ok, discovery} <- Clusters.api_discovery(cluster) do
      Enum.map(discovery, fn {g, v, k}, name -> %{
        group: g,
        version: v,
        kind: k,
        display_name: name
      } end)
      |> Jason.encode()
    else
      {:session, _} -> {:error, "No cluster bound to this session"}
      err -> err
    end
  end
end
