defimpl Console.AI.Evidence, for: Console.Schema.Cluster do
  use Console.AI.Evidence.Base
  alias Console.Repo
  alias Console.AI.Worker
  alias Console.Schema.{AiInsight, Cluster, ClusterInsightComponent, ServiceComponent}

  require Logger

  def custom(_), do: false

  def generate(%Cluster{insight_components: [_ | _] = components} = cluster) do
    components = Enum.map(components, &{&1, start_insight(&1)})
                 |> Enum.map(fn {c, t} -> {c, await_insight(t)} end)
                 |> Enum.map(fn
                   {c, {:ok, %AiInsight{} = insight}} -> {c, insight}
                   {_, err} ->
                    Logger.error("failed to generate component insight, reason: #{inspect(err)}")
                    nil
                 end)
                 |> Enum.filter(& &1)
    description(cluster)
    |> Enum.concat(component_statuses(components))
    |> history()
  end
  def generate(_), do: {:ok, []}

  def insight(%Cluster{insight: insight}), do: insight

  def preload(comp), do: Repo.preload(comp, [insight: :evidence, insight_components: [:cluster, insight: :evidence]])

  # A component managed by a service already has an insight generated for the service, reuse it instead of paying for a second one
  defp start_insight(%ClusterInsightComponent{service_id: sid} = comp) when is_binary(sid) do
    case service_insight(comp) do
      %AiInsight{} = insight -> {:reuse, insight}
      _ -> {:task, Worker.generate(comp)}
    end
  end
  defp start_insight(comp), do: {:task, Worker.generate(comp)}

  defp await_insight({:reuse, insight}), do: {:ok, insight}
  defp await_insight({:task, task}), do: Worker.await(task)

  defp service_insight(%ClusterInsightComponent{service_id: sid, group: g, version: v, kind: k, namespace: ns, name: n}) do
    ServiceComponent.for_service(sid)
    |> ServiceComponent.for_identifier({g, v, k, ns, n})
    |> ServiceComponent.with_insight()
    |> Repo.one()
    |> case do
      %ServiceComponent{insight: insight} -> insight
      _ -> nil
    end
  end

  defp description(%Cluster{distro: d, name: n, version: v}) do
    [
      {:user, """
      The following is a list of failing deployments, statefulsets and daemonsets for a kubernetes cluster. The cluster itself
      is an #{distro(d)} kubernetes cluster named #{n} currently at version #{v}.  I'd like a prioritized list of troubleshooting hints
      to understand how to resolve any pressing risks to the availability of the cluster any of these failures might cause.

      The individual components are listed below:
      """}
    ]
  end

  defp component_statuses([_ | _] = components) do
    Enum.map(components, fn {comp, insight} ->
      {:user, "the kubernetes resource #{component(comp)} has the following summary of its status:\n#{insight.text}"}
    end)
  end
  defp component_statuses(_), do: []
end
