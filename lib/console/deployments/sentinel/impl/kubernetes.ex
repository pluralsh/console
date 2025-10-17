defmodule Console.Deployments.Sentinel.Impl.Kubernetes do
  use GenServer
  import Console.Deployments.Sentinel.Impl.Base
  alias Console.Deployments.Clusters
  alias Console.Schema.Sentinel.SentinelCheck
  alias Console.Schema.Sentinel.SentinelCheck.CheckConfiguration
  alias Console.Schema.Sentinel.SentinelCheck.CheckConfiguration.KubernetesConfiguration
  alias Console.AI.Evidence

  @preface """
  You are a seasoned reliability engineer and are trying to evaluate the health of a given system.  You will
  be given a kubernetes object spec and determine whether it is healthy or not.

  In either case, be sure to give a clear reason for your choice to make it clear to everyone your reasoning.
  """

  def start(%SentinelCheck{} = check, pid, rules) do
    GenServer.start(__MODULE__, {check, pid, rules})
  end

  def init({%SentinelCheck{} = check, pid, rules}) do
    send(self(), :done)
    {:ok, {check, pid, rules}}
  end

  def handle_info(:done, {check, pid, rules} = state) do
    with {:ok, prompt, _} <- prompt(check.configuration) do
      prompt
      |> maybe_add_rule(check, rules)
      |> prepend({:user, "Here is the current state of the kubernetes object:"})
      |> ai_call(@preface)
      |> case do
        {:ok, %{} = status} ->
          post_status(pid, status)
        {:error, err} ->
          post_status(pid, %{status: :failed, reason: err})
        :ignore -> :ok
      end

      {:stop, :normal, state}
    else
      {:error, err} ->
        post_status(pid, %{status: :failed, reason: "#{inspect(err)}"})
        {:stop, :normal, {check, pid, rules}}
    end
  end

  def prompt(%CheckConfiguration{kubernetes: %KubernetesConfiguration{cluster_id: cluster_id} = conf}) when is_binary(cluster_id) do
    cluster = Clusters.get_cluster(cluster_id)
    Evidence.generate(%Console.Schema.ClusterInsightComponent{
      cluster: cluster,
      group: conf.group,
      version: conf.version,
      kind: conf.kind,
      namespace: conf.namespace,
      name: conf.name
    })
  end
  def prompt(_), do: {:error, "Kubernetes configuration not found"}

  defp maybe_add_rule(msgs, %SentinelCheck{rule_file: rule_file}, %{} = rules) when is_binary(rule_file) do
    case Map.fetch(rules, rule_file) do
      {:ok, rule} when is_binary(rule) ->
        append(msgs, {:user, "Here is the guidance you should use when interpreting all the kubernetes data:\n#{rule}\n\n"})
      _ -> msgs
    end
  end
  defp maybe_add_rule(msgs, _, _), do: msgs
end
