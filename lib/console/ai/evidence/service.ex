defimpl Console.AI.Evidence, for: Console.Schema.Service do
  use Console.AI.Evidence.Base
  alias Console.Repo
  alias Console.AI.Worker
  alias Console.AI.Evidence.{Logs, Context}
  alias Console.Schema.{AiInsight, Service, ServiceComponent, ServiceError, Cluster}

  require Logger

  def custom(_), do: false

  def generate(%Service{} = service) do
    components = ServiceComponent.for_service(service.id)
                 |> ServiceComponent.for_states([:failed, :pending])
                 |> Repo.all()
                 |> Repo.preload([:insight, service: :cluster])
                 |> Enum.map(&{&1, Worker.generate(&1)})
                 |> Enum.map(fn {c, t} -> {c, Worker.await(t)} end)
                 |> Enum.map(fn
                   {c, {:ok, %AiInsight{} = insight}} -> {c, insight}
                   {_, err} ->
                    Logger.error("failed to generate component insight, reason: #{inspect(err)}")
                    nil
                 end)
                 |> Enum.filter(& &1)
    (
      description(service) ++
      service_errors(service) ++
      component_statuses(components)
    )
    |> Logs.with_logging(service)
    |> Context.result()
  end

  def insight(%Service{insight: insight}), do: insight

  def preload(comp), do: Console.Repo.preload(comp, [:cluster, :errors, :repository, :flow, insight: :evidence])

  defp description(%Service{status: s, namespace: ns, name: name, cluster: %Cluster{name: cluster} = c} = svc) do
    [
      {:user, """
        The plural service #{name} is currently in state #{s}, meaning: #{state_description(svc)}.

        Some details about this service, it's syncing into the kubenetes namespace #{ns} in the #{c.distro} kubernetes cluster #{cluster}.

        #{git_source(svc)}
        #{helm_source(svc)}

        I'll list out a few more facts about this service as well.
      """}
    ]
  end

  defp component_statuses([_ | _] = components) do
    Enum.map(components, fn {comp, insight} ->
      {:user, "the component #{component(comp)} with state #{comp.state} (meaning #{meaning(comp.state)}) has a summary of its current status:\n#{insight.text}"}
    end)
    |> prepend({:user, "this service has a number of kubernetes objects that are currently in an indeterminate state as well, here's a rundown of them"})
  end
  defp component_statuses(_), do: []

  defp state_description(%Service{status: :stale}), do: "waiting for kubernetes to converge to its desired state"
  defp state_description(%Service{status: :failed}), do: "some misconfiguration has been detected that prevents kubernetes from converging to the desired state"

  defp service_errors(%Service{errors: [_ | _] = errors}) do
    Enum.map(errors, fn %ServiceError{source: source, message: msg} ->
      {:user, "the service has a Plural-derived error with an error source of #{source} and an error message; #{msg}"}
    end)
    |> prepend({:user, "We've also noticed a few errors in the Plural CD system itself, here's a list of them."})
  end
  defp service_errors(_), do: []

  defp git_source(%Service{git: %{folder: f, ref: ref}, repository: %{url: url}}),
    do: "It is sourcing manifests from the git repository #{url} under the folder #{f} in the git reference #{ref}"
  defp git_source(_), do: ""

  defp helm_source(%Service{helm: %{version: _} = helm}) do
    "It is configuring helm with the following settings:\n #{helm_settings(helm)}"
  end
  defp helm_source(_), do: ""

  defp helm_settings(helm) do
    Map.take(helm, ~w(url version chart values_files)a)
    |> Enum.filter(&elem(&1, 1))
    |> Enum.map(fn {k, v} -> "#{k}: #{stringify(v)}" end)
    |> Enum.join(", ")
  end

  defp stringify(s) when is_binary(s), do: s
  defp stringify(l) when is_list(l), do: Enum.join(l, ",")
end
