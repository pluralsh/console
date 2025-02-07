defimpl Console.AI.Evidence, for: Console.Schema.ServiceComponent do
  use Console.AI.Evidence.Base
  alias Console.AI.Evidence.Component.Resource
  alias Console.Schema.ServiceComponent

  @blacklist ~w(Secret ConfigMap)

  def custom(_), do: false

  def generate(%ServiceComponent{kind: kind}) when kind in @blacklist, do: {:ok, []}
  def generate(%ServiceComponent{service: %{cluster: cluster}} = comp) do
    save_kubeconfig(cluster)
    with {:ok, resource} <- Resource.resource(comp, cluster),
         {:ok, events} <- Resource.events(resource),
         {:ok, hydration} <- Resource.hydrate(resource) do
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
      )
    end
  end

  def insight(%{insight: insight}), do: insight

  def preload(comp), do: Console.Repo.preload(comp, [:insight, service: :cluster])

  defp tpl_hydration([_ | _] = hydration) do
    [
      {:user, "And I've also found some more useful context to help understand what's going on with this component"}
      | hydration
    ]
  end
  defp tpl_hydration(_), do: []

  defp description(%ServiceComponent{} = comp),
    do: "#{comp.group}/#{comp.version} #{comp.kind}#{ns(comp.namespace)} with name #{comp.name}"
end
