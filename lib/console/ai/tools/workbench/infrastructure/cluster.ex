defmodule Console.AI.Tools.Workbench.Infrastructure.Cluster do
  use Console.AI.Tools.Agent.Base
  alias Console.Repo
  alias Console.Deployments.{Clusters, Policies}
  alias Console.Schema.{User}

  require EEx

  embedded_schema do
    field :user, :map, virtual: true
    field :handle, :string
  end

  @valid ~w(handle)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/cluster.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_cluster"
  def description(_), do: "Get the details of a cluster from the Plural API.  This will also include deep information about the cluster's upgradeability, plural metadata, and version/distro details"

  def implement(_, %__MODULE__{user: %User{} = user, handle: handle}) do
    Clusters.get_cluster_by_handle(handle)
    |> Repo.preload([:tags, :project])
    |> Policies.allow(user, :read)
    |> case do
      {:ok, cluster} ->
        {:ok, cluster_prompt(cluster: cluster, upgrade_plan: Clusters.upgrade_plan(cluster))}

      nil -> {:error, "could not find cluster with handle #{handle}"}
      error -> error
    end
  end

  EEx.function_from_file(
    :defp,
    :cluster_prompt,
    Path.join(:code.priv_dir(:console), "prompts/workbench/infrastructure/cluster.md.eex"),
    [:assigns],
    trim: true
  )
end
