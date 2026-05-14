defmodule Console.AI.Tools.Workbench.Infrastructure.Cluster do
  use Console.AI.Tools.Agent.Base
  import Piazza.Ecto.Schema, only: [validate_one_present: 2]
  alias Console.Repo
  alias Console.Deployments.{Clusters, Policies}
  alias Console.Schema.{User, Cluster}

  require EEx

  embedded_schema do
    field :user,       :map, virtual: true
    field :handle,     :string
    field :cluster_id, :string
  end

  @valid ~w(handle cluster_id)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> check_uuid(:cluster_id)
    |> validate_one_present(@valid)
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/cluster.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_cluster"
  def description(_), do: "Get the details of a cluster from the Plural API.  This will also include deep information about the cluster's upgradeability, plural metadata, and version/distro details"

  def implement(%__MODULE__{user: %User{} = user, handle: handle, cluster_id: cluster_id} = model) do
    fetch_cluster(model)
    |> Repo.preload([:tags, :project])
    |> Policies.allow(user, :read)
    |> case do
      {:ok, nil} ->
        {:error, "could not find cluster with handle #{handle} or cluster_id #{cluster_id}"}

      {:ok, cluster} ->
        {:ok, String.trim(cluster_prompt(cluster: cluster, upgrade_plan: simplified_upgrade_plan(cluster)))}

      nil ->
        {:error, "could not find cluster with handle #{handle} or cluster_id #{cluster_id}"}

      error -> error
    end
  end

  defp fetch_cluster(%{cluster_id: id}) when is_binary(id), do: Clusters.get_cluster(id)
  defp fetch_cluster(%{handle: handle}) when is_binary(handle), do: Clusters.get_cluster_by_handle(handle)

  def simplified_upgrade_plan(%Cluster{} = cluster) do
    plan = Clusters.upgrade_plan(cluster)
    %{
      blocking_addons: Enum.map(plan.blocking_addons, &simplify_addon/1),
      blocking_cloud_addons: Enum.map(plan.blocking_cloud_addons, &simplify_cloud_addon/1),
      failed_insights: plan.failed_insights,
    }
  end
  def simplified_upgrade_plan(_), do: nil

  defp simplify_addon(%{current: curr, fix: fix} = addon) do
    %{
      current: Map.take(curr, [:version, :summary])
               |> Map.put(:name, curr.addon && curr.addon.name)
               |> Map.put(:addon_details, Map.drop(curr, [:addon])),
      fix: fix,
      callout: Map.get(addon, :callout)
    }
  end
  defp simplify_addon(_), do: nil

  defp simplify_cloud_addon(%{current: curr, fix: fix} = addon) do
    %{
      current: Map.take(curr, [:version, :summary])
               |> Map.put(:addon_details, Map.drop(curr, [:addon])),
      fix: fix,
      callout: Map.get(addon, :callout)
    }
  end
  defp simplify_cloud_addon(_), do: nil

  EEx.function_from_file(
    :defp,
    :cluster_prompt,
    Path.join(:code.priv_dir(:console), "prompts/workbench/infrastructure/cluster.md.eex"),
    [:assigns]
  )
end
