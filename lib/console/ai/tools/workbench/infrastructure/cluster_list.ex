defmodule Console.AI.Tools.Workbench.Infrastructure.ClusterList do
  use Console.AI.Tools.Agent.Base
  alias Console.Deployments.Clusters
  alias Console.Repo
  alias Console.Schema.{Cluster, User}

  embedded_schema do
    field :user, :map, virtual: true
    field :q, :string
  end

  @valid ~w(q)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/cluster_list.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_clusters"
  def description(_), do: "List Kubernetes clusters the current user can read. Returns compact JSON; use plrl_cluster with a handle for full details."

  def implement(_, %__MODULE__{user: %User{} = user, q: q}) do
    Cluster.ordered()
    |> Cluster.for_user(user)
    |> Cluster.preloaded([:tags, :project])
    |> maybe_search(q)
    |> Repo.all()
    |> Enum.map(&cluster_brief/1)
    |> Jason.encode()
  end

  defp maybe_search(query, q) when is_binary(q) and q != "", do: Cluster.search(query, q)
  defp maybe_search(query, _), do: query

  defp cluster_brief(%Cluster{} = c) do
    %{
      id: c.id,
      handle: c.handle,
      name: c.name,
      distro: c.distro,
      self: c.self,
      virtual: c.virtual,
      installed: c.installed,
      current_version: c.current_version,
      version: c.version,
      upgrade_plan: upgrade_plan_brief(c.upgrade_plan),
      extended_support: extended_support_brief(Clusters.extended_support(c)),
      project: c.project && %{id: c.project.id, name: c.project.name},
      tags: Enum.map(c.tags || [], &%{name: &1.name, value: &1.value})
    }
  end

  defp upgrade_plan_brief(nil), do: nil

  defp upgrade_plan_brief(plan) do
    %{
      compatibilities: plan.compatibilities,
      deprecations: plan.deprecations,
      incompatibilities: plan.incompatibilities,
      kubelet_skew: plan.kubelet_skew
    }
  end

  defp extended_support_brief(nil), do: nil

  defp extended_support_brief(%{extended: _, extended_from: _} = info) do
    %{extended: info.extended, extended_from: info.extended_from}
  end
end
