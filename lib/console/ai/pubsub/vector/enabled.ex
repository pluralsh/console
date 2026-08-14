defprotocol Console.AI.Vector.Enabled do
  @fallback_to_any true

  def enabled?(struct)
end

defimpl Console.AI.Vector.Enabled, for: Any do
  def enabled?(_), do: true
end

defimpl Console.AI.Vector.Enabled, for: Tuple do
  use Nebulex.Caching
  alias Console.Deployments.{Clusters, Settings}

  @adapter Console.conf(:multilevel_cache)

  @decorate cacheable(cache: @adapter, key: {:vector_enabled, key}, opts: [ttl: :timer.minutes(30)])
  def enabled?(key) do
    case key do
      {:cluster, id} -> Clusters.get_cluster(id)
      {:project, id} -> Settings.get_project!(id)
      _ -> :ok
    end
    |> Console.AI.Vector.Enabled.enabled?()
  end
end

defimpl Console.AI.Vector.Enabled, for: Console.Schema.Project do
  def enabled?(%Console.Schema.Project{disable_insights: disable_insights}),
    do: !disable_insights
end

defimpl Console.AI.Vector.Enabled, for: Console.Schema.Cluster do
  def enabled?(%Console.Schema.Cluster{disable_ai: disable, project_id: project_id}),
    do: !disable && Console.AI.Vector.Enabled.enabled?({:project, project_id})
end

defimpl Console.AI.Vector.Enabled, for: Console.Schema.Service do
  def enabled?(%Console.Schema.Service{cluster_id: cluster_id}),
    do: Console.AI.Vector.Enabled.enabled?({:cluster, cluster_id})
end

defimpl Console.AI.Vector.Enabled, for: Console.Schema.Stack do
  def enabled?(%Console.Schema.Stack{project_id: project_id}),
    do: Console.AI.Vector.Enabled.enabled?({:project, project_id})
end
