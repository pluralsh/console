defprotocol Console.Deployments.PubSub.Broadcastable do
  @fallback_to_any true

  @doc """
  Returns the payload and topics for a graphql subscription event
  """
  @spec message(term) :: {binary, binary, map} | :ok
  def message(event)
end

defimpl Console.Deployments.PubSub.Broadcastable, for: Any do
  def message(_), do: :ok
end

defimpl Console.Deployments.PubSub.Broadcastable, for: [
  Console.PubSub.ServiceCreated,
  Console.PubSub.ServiceUpdated,
  Console.PubSub.ServiceDeleted,
] do

  def message(%{actor: :ignore}), do: :ignore
  def message(%{item: %{id: id, cluster_id: cluster_id} = svc}),
    do: {"cluster:#{cluster_id}", "service.event", %{"id" => id, "kick" => svc.kick}}
end

defimpl Console.Deployments.PubSub.Broadcastable, for: Console.PubSub.ServiceDependenciesUpdated do
  alias Console.Schema.{ServiceDependency, Service}

  def message(%{item: [_ | _] = items}) do
    items
    |> Console.Repo.preload([:service])
    |> Enum.map(fn %ServiceDependency{service: %Service{cluster_id: cid, id: id}} ->
      {"cluster:#{cid}", "service.event", %{"id" => id}}
    end)
  end
  def message(_), do: :ignore
end

defimpl Console.Deployments.PubSub.Broadcastable, for: Console.PubSub.ServiceManifestsRequested do
  def message(%{item: %{id: id, cluster_id: cluster_id}}),
    do: {"cluster:#{cluster_id}", "service.manifests", %{"id" => id}}
end

defimpl Console.Deployments.PubSub.Broadcastable, for: [Console.PubSub.ClusterRestoreCreated] do
  def message(%{item: item}) do
    %{id: id, backup: %{cluster_id: cluster_id}} = Console.Repo.preload(item, [:backup])
    {"cluster:#{cluster_id}", "restore.event", %{"id" => id}}
  end
end

defimpl Console.Deployments.PubSub.Broadcastable, for: [Console.PubSub.PipelineGateUpdated] do
  def message(%{item: %{type: :job, id: id, cluster_id: cid}}) when is_binary(cid),
    do: {"cluster:#{cid}", "gate.event", %{"id" => id}}
  def message(_), do: :ok
end

defimpl Console.Deployments.PubSub.Broadcastable, for: [Console.PubSub.StackRunCreated, Console.PubSub.StackRunUpdated, Console.PubSub.StackRunDeleted] do
  def message(%{item: %{cluster_id: cid, id: id}}), do: {"cluster:#{cid}", "stack.run.event", %{"id" => id}}
end

defimpl Console.Deployments.PubSub.Broadcastable, for: [Console.PubSub.AgentRunCreated] do
  alias Console.Schema.AgentRun

  def message(%{item: %AgentRun{} = run}) do
    %{runtime: %{cluster_id: cid}} = Console.Repo.preload(run, [:runtime])
    {"cluster:#{cid}", "agent.run.event", %{"id" => run.id}}
  end
end
