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
  def message(%{item: %{id: id, cluster_id: cluster_id}}),
    do: {"cluster:#{cluster_id}", "service.event", %{"id" => id}}
end

defimpl Console.Deployments.PubSub.Broadcastable, for: [Console.PubSub.ClusterRestoreCreated] do
  def message(%{item: item}) do
    %{id: id, backup: %{cluster_id: cluster_id}} = Console.Repo.preload(item, [:backup])
    {"cluster:#{cluster_id}", "restore.event", %{"id" => id}}
  end
end
