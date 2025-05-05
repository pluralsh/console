defprotocol Console.Deployments.PubSub.Previewable do
  @fallback_to_any true

  @doc """
  Returns a stage/edge or nothing to drive a subsequent pipeline action
  """
  @spec reconcile(term) :: any
  def reconcile(event)
end

defimpl Console.Deployments.PubSub.Previewable, for: Any do
  def reconcile(_), do: :ok
end

defimpl Console.Deployments.PubSub.Previewable, for: [
  Console.PubSub.PullRequestCreated,
  Console.PubSub.PullRequestUpdated
] do
  alias Console.Schema.PullRequest
  alias Console.Deployments.Notifications.Utils
  alias Console.Deployments.Flows.Preview

  def reconcile(%@for{item: %PullRequest{status: s} = pr}) when s in ~w(merged closed)a,
    do: Preview.delete_instance(pr)
  def reconcile(%@for{item: %PullRequest{} = pr}) do
    Utils.deduplicate({:pr_updated, pr.id}, fn ->
      Preview.sync_instance(pr)
    end, ttl: :timer.seconds(15))
  end
end

defimpl Console.Deployments.PubSub.Previewable, for: Console.PubSub.PreviewEnvironmentInstanceCreated do
  alias Console.Deployments.Flows.Preview

  def reconcile(%@for{item: inst}), do: Preview.pr_comment(inst)
end

defimpl Console.Deployments.PubSub.Previewable, for: [
  Console.PubSub.ServiceUpdated,
  Console.PubSub.ServiceComponentsUpdated
] do
  alias Console.Deployments.Flows.Preview

  def reconcile(%@for{item: svc}) do
    case Preview.fresh?(svc.updated_at) do
      true -> Preview.sync_service(svc)
      false -> :ok
    end
  end
end
