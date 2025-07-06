defmodule Console.AI.Tools.Agent.Clusters do
  use Console.AI.Tools.Agent.Base
  alias Console.Repo
  alias Console.Schema.{Cluster, User}

  embedded_schema do
    field :query, :string
  end

  @valid ~w(query)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/clusters.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("clusters")
  def description(), do: "Shows the clusters this user has read access to. Use this to understand what kubernetes clusters can be used in deployments, and avoid using the mgmt cluster unless explicitly prompted (create new workload clusters instead)."

  def implement(%__MODULE__{query: q}) do
    %User{} = user = Tool.actor()

    Cluster.for_user(user)
    |> Repo.all()
    |> Repo.preload([:tags, :project])
    |> Console.AI.Tools.Clusters.postprocess(q)
  end
end
