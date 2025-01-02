defimpl Console.AI.Evidence, for: Console.Schema.Cluster do
  use Console.AI.Evidence.Base
  alias Console.Repo
  alias Console.AI.Worker
  alias Console.Schema.{AiInsight, Cluster}

  require Logger

  def custom(_), do: false

  def generate(%Cluster{insight_components: [_ | _] = components} = cluster) do
    components = Enum.map(components, &{&1, Worker.generate(&1)})
                 |> Enum.map(fn {c, t} -> {c, Worker.await(t)} end)
                 |> Enum.map(fn
                   {c, {:ok, %AiInsight{} = insight}} -> {c, insight}
                   {_, err} ->
                    Logger.error("failed to generate component insight, reason: #{inspect(err)}")
                    nil
                 end)
                 |> Enum.filter(& &1)
    {:ok, description(cluster) ++ component_statuses(components)}
  end
  def generate(_), do: {:ok, []}

  def insight(%Cluster{insight: insight}), do: insight

  def preload(comp), do: Repo.preload(comp, [:insight, insight_components: [:cluster, :insight]])

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
