defimpl Console.AI.Evidence, for: Console.Schema.ClusterInsightComponent do
  use Console.AI.Evidence.Base
  alias Console.AI.Evidence.{Logs, Context}
  alias Console.AI.Evidence.Component.Resource
  alias Console.Schema.{ClusterInsightComponent, ServiceComponent}

  @blacklist ~w(Secret ConfigMap)

  def custom(_), do: false

  def generate(%ClusterInsightComponent{kind: kind}) when kind in @blacklist, do: {:ok, []}
  def generate(%ClusterInsightComponent{cluster: cluster} = comp) do
    save_kubeconfig(cluster)
    with {:ok, resource} <- Resource.resource(to_svc_component(comp), cluster),
         {:ok, events} <- Resource.events(resource),
         {:ok, hydration, claims} <- Resource.hydrate(resource) do
      (
        [{:user, """
          The kubernetes resource #{component(comp)}.  It is deployed on the #{distro(cluster.distro)} kubernetes cluster named #{cluster.name} with version #{cluster.version}

          The raw json object itself is as follows:

          ```json
          #{encode(resource)}
          ```
          """
        }]
        ++ tpl_events(events)
        ++ tpl_hydration(hydration)
      )
      |> Logs.with_logging(comp)
      |> Context.evidence(claims)
      |> Context.result()
    end
  end

  def insight(%{insight: insight}), do: insight

  def preload(comp), do: Console.Repo.preload(comp, [:cluster, insight: :evidence])

  defp tpl_hydration([_ | _] = hydration) do
    prepend(
      hydration,
      {:user, "And I've also found some more useful context to help understand what's going on with this component"}
    )
  end
  defp tpl_hydration(_), do: []

  defp to_svc_component(%ClusterInsightComponent{group: g, version: v, kind: k, namespace: ns, name: n}) do
    %ServiceComponent{
      group: g,
      kind: k,
      version: v,
      namespace: ns,
      name: n
    }
  end
end
