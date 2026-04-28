defmodule Console.AI.Tools.Workbench.Infrastructure.ClusterList do
  use Console.AI.Tools.Agent.Base
  alias Console.Deployments.Clusters
  alias Console.Repo
  alias Console.Schema.{Cluster, User}

  embedded_schema do
    field :user, :map, virtual: true
    field :q,       :string
    field :project, :string
    field :distro,  Console.Schema.Cluster.Distro

    embeds_many :tags, Tag, on_replace: :delete do
      field :name, :string
      field :value, :string
    end
  end

  @valid ~w(q project distro)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:tags, with: &tag_changeset/2)
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/cluster_list.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_clusters"
  def description(_), do: "List Kubernetes clusters the current user can read. Returns compact JSON; use plrl_cluster with a handle for full details."

  def implement(%__MODULE__{user: %User{} = user, q: q, project: project, distro: distro, tags: tags}) do
    Cluster.ordered()
    |> Cluster.for_user(user)
    |> maybe_distro(distro)
    |> maybe_tags(tags)
    |> maybe_project(project)
    |> Cluster.preloaded([:tags, :project])
    |> maybe_search(q)
    |> Repo.all()
    |> Enum.map(&cluster_brief/1)
    |> Jason.encode()
  end

  defp maybe_search(query, q) when is_binary(q) and q != "", do: Cluster.search(query, q)
  defp maybe_search(query, _), do: query

  defp maybe_distro(query, nil), do: query
  defp maybe_distro(query, distro), do: Cluster.for_distro(query, distro)

  defp maybe_tags(query, [_ | _ ] = tags), do: Cluster.for_tags(query, tags)
  defp maybe_tags(query, _), do: query

  defp maybe_project(query, name) when is_binary(name) and byte_size(name) > 0,
    do: Cluster.for_project_name(query, name)
  defp maybe_project(query, _), do: query

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
      tags: Enum.map(c.tags || [], & %{name: &1.name, value: &1.value})
    }
  end

  defp upgrade_plan_brief(nil), do: nil

  defp upgrade_plan_brief(plan) do
    %{
      kubernetes_component_compatibilities_satisfied: plan.compatibilities,
      cloud_upgrade_insights_satisfied: plan.deprecations,
      no_kubelet_skew: plan.kubelet_skew
    }
  end

  defp extended_support_brief(nil), do: nil

  defp extended_support_brief(%{extended: _, extended_from: _} = info) do
    %{extended: info.extended, extended_from: info.extended_from}
  end

  defp tag_changeset(model, attrs) do
    model
    |> cast(attrs, [:name, :value])
    |> validate_required([:name, :value])
  end
end
