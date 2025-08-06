defmodule Console.AI.Tools.Agent.SwitchCluster do
  use Console.AI.Tools.Agent.Base
  alias Console.Schema.{Cluster, User}
  alias Console.Deployments.Clusters

  embedded_schema do
    field :handle, :string
  end

  @valid ~w(handle)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/agent/switch_cluster.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("switch_cluster")
  def description(), do: "Changes the current cluster in this session to the provided cluster handle"

  def implement(%__MODULE__{handle: handle}) do
    with %Cluster{} = cluster <- Clusters.get_cluster_by_handle(handle),
         %User{} = user <- Tool.actor(),
         {:ok, _} <- Policies.allow(cluster, user, :read),
         {:ok, _} <- update_session(%{cluster_id: cluster.id}, true) do
      {:ok, "Switched to cluster #{cluster.handle}"}
    else
      {:error, err} -> {:ok, "failed to switch to cluster #{handle}, reason: #{inspect(err)}"}
      nil -> {:error, "could not find cluster with handle #{handle}"}
    end
  end
end
