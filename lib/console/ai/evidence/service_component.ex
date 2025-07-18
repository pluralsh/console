defimpl Console.AI.Evidence, for: Console.Schema.ServiceComponent do
  use Console.AI.Evidence.Base
  alias Console.AI.Worker
  alias Console.AI.Evidence.Component.Resource
  alias Console.Schema.{ServiceComponent, ServiceComponentChild, AiInsight}

  require Logger

  @blacklist ~w(Secret ConfigMap)

  def custom(_), do: false

  def generate(%ServiceComponent{kind: kind}) when kind in @blacklist, do: {:ok, []}
  def generate(%ServiceComponent{service: %{cluster: cluster}} = comp) do
    save_kubeconfig(cluster)
    with {:ok, resource} <- Resource.resource(comp, cluster),
         {:ok, events} <- Resource.events(resource),
         {:ok, hydration, claims} <- Resource.hydrate(resource) do
      history(
        [{:user, """
          The kubernetes component #{description(comp)} is in #{comp.state} state, meaning #{meaning(comp.state)}.  It is deployed
          on the #{distro(cluster.distro)} kubernetes cluster named #{cluster.name} using Plural's GitOps tooling.

          The raw json object itself is as follows:

          ```json
          #{encode(resource)}
          ```
          """
        }]
        ++ tpl_events(events)
        ++ tpl_hydration(hydration)
        ++ traverse_children(comp, Resource.custom?(resource)),
        claims
      )
    end
  end

  def insight(%{insight: insight}), do: insight

  def preload(comp), do: Console.Repo.preload(comp, [insight: :evidence, service: :cluster])

  defp tpl_hydration([_ | _] = hydration) do
    [
      {:user, "And I've also found some more useful context to help understand what's going on with this component"}
      | hydration
    ]
  end
  defp tpl_hydration(_), do: []

  defp traverse_children(%ServiceComponent{id: id}, true) do
    ServiceComponentChild.for_component(id)
    |> ServiceComponentChild.for_states([:failed, :pending])
    |> Console.Repo.all()
    |> Console.Repo.preload([:insight, component: [service: :cluster]])
    |> Enum.map(& {&1, Worker.generate(&1)})
    |> Enum.map(fn {c, t} -> {c, Worker.await(t)} end)
    |> Enum.map(fn
      {c, {:ok, %AiInsight{} = insight}} -> {c, insight}
      {_, err} ->
        Logger.error("failed to generate insight for component child, reason: #{inspect(err)}")
        nil
    end)
    |> Enum.filter(& &1)
    |> Enum.map(fn {c, insight} ->
      {:user, """
      #{description(c)} (uid is #{c.uid}, parent uid is #{c.parent_uid}) is in #{c.state} state, meaning #{meaning(c.state)} (parent uid is #{c.parent_uid}).  Here's a brief summary of the current status:

      #{insight.text}
      """}
    end)
    |> prepend({:user, "this component owns a number of kubernetes objects (potentially recursively) that are currently in an indeterminate state as well, here's a rundown of them"})
  end
  defp traverse_children(_, _), do: []

  defp description(%ServiceComponent{} = comp),
    do: "#{comp.group}/#{comp.version} #{comp.kind}#{ns(comp.namespace)} with name #{comp.name}"
  defp description(%ServiceComponentChild{} = comp),
    do: "#{comp.group}/#{comp.version} #{comp.kind}#{ns(comp.namespace)} with name #{comp.name}"
end
