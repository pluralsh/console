defprotocol Console.AI.Summary.Summarizable do
  @spec summarize(struct, binary) :: {:ok, binary, boolean} | Console.error
  def summarize(struct, prompt)
end

defimpl Console.AI.Summary.Summarizable, for: [Console.Schema.ServiceComponent] do
  use Console.AI.Evidence.Base
  alias Console.AI.Summary.Component.Resource
  alias Console.Schema.{ServiceComponent, ServiceComponentChild}

  require Logger

  @blacklist ~w(Secret ConfigMap)

  def custom(_), do: false

  def summarize(%ServiceComponent{kind: kind}, _) when kind in @blacklist, do: {:ok, "ignore", false}
  def summarize(%ServiceComponent{service: %{cluster: cluster}} = comp, prompt) do
    with {:ok, resource} <- Resource.resource(comp, cluster),
         {:ok, events} <- Resource.events(resource),
         {:ok, hydration} <- Resource.hydrate(resource) do

      ([{:user, """
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
      ++ traverse_children(comp, Resource.custom?(resource), prompt)
      )
      |> Console.AI.Summary.Executor.execute(prompt)
    end
  end

  defp tpl_hydration([_ | _] = hydration) do
    [
      {:user, "And I've also found some more useful context to help understand what's going on with this component"}
      | hydration
    ]
  end
  defp tpl_hydration(_), do: []

  defp traverse_children(%ServiceComponent{id: id} = comp, true, prompt) do
    ServiceComponentChild.for_component(id)
    |> ServiceComponentChild.with_limit(15)
    |> Console.Repo.all()
    |> Enum.map(&Map.put(&1, :component, comp))
    |> Task.async_stream(& {&1, Console.AI.Summary.Summarizable.summarize(&1, prompt)}, timeout: :infinity, max_concurrency: 5)
    |> Stream.filter(fn
      {:ok, {_, {:ok, _, relevant}}} -> relevant
      _ -> false
    end)
    |> Stream.map(fn {:ok, {c, {:ok, summary, _}}} -> {c, summary} end)
    |> Enum.filter(& &1)
    |> Enum.map(fn {c, summary} ->
      {:user, """
      #{description(c)} (uid is #{c.uid}, parent uid is #{c.parent_uid}) is in #{c.state} state, meaning #{meaning(c.state)} (parent uid is #{c.parent_uid}).  Here's the result of analyzing this subcomponent:

      #{summary}
      """}
    end)
    |> prepend({:user, "this component owns a number of kubernetes objects (potentially recursively) that are currently in an indeterminate state as well, here's a rundown of them"})
  end
  defp traverse_children(_, _, _), do: []

  defp description(%ServiceComponent{} = comp),
    do: "#{comp.group}/#{comp.version} #{comp.kind}#{ns(comp.namespace)} with name #{comp.name}"
  defp description(%ServiceComponentChild{} = comp),
    do: "#{comp.group}/#{comp.version} #{comp.kind}#{ns(comp.namespace)} with name #{comp.name}"
end

defimpl Console.AI.Summary.Summarizable, for: Console.Schema.ServiceComponentChild do
  use Console.AI.Evidence.Base
  alias Console.AI.Summary.Component.Resource
  alias Console.Schema.{ServiceComponentChild}

  require Logger

  @blacklist ~w(Secret ConfigMap)


  def summarize(%ServiceComponentChild{kind: kind}, _) when kind in @blacklist, do: {:ok, "ignore", false}
  def summarize(%ServiceComponentChild{component: %{service: %{cluster: cluster}}} = comp, prompt) do
    save_kubeconfig(cluster)
    with {:ok, resource} <- Resource.resource(comp, cluster),
         {:ok, events} <- Resource.events(resource),
         {:ok, hydration} <- Resource.hydrate(resource) do
      ([{:user, """
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
      |> Console.AI.Summary.Executor.execute(prompt)
    end
  end

  defp tpl_hydration([_ | _] = hydration) do
    [
      {:user, "And I've also found some more useful context to help understand what's going on with this component"}
      | hydration
    ]
  end
  defp tpl_hydration(_), do: []

  defp description(%ServiceComponentChild{} = comp),
    do: "#{comp.group}/#{comp.version} #{comp.kind}#{ns(comp.namespace)} with name #{comp.name}"
end
