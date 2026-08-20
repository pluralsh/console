defprotocol Console.PubSub.Cacheable do
  @fallback_to_any true

  @doc """
  Returns the payload and topics for a graphql subscription event
  """
  @type action :: {:set | :del, binary, map}

  @spec cache(term) :: action | [action] | :ok
  def cache(event)
end

defimpl Console.PubSub.Cacheable, for: Any do
  def cache(_), do: :ok
end

defimpl Console.PubSub.Cacheable, for: [
  Console.PubSub.WorkbenchWebhookCreated,
  Console.PubSub.WorkbenchWebhookUpdated,
  Console.PubSub.WorkbenchWebhookDeleted,
] do
  alias Console.Schema.WorkbenchWebhook

  def cache(%@for{item: %WorkbenchWebhook{webhook_id: wid} = hook}) when is_binary(wid),
    do: {:del, {:wb_webhooks, wid}, hook}
  def cache(%@for{item: %WorkbenchWebhook{issue_webhook_id: iwid} = hook}) when is_binary(iwid),
    do: {:del, {:wb_webhooks_for_issue, iwid}, hook}
  def cache(_), do: :ok
end

defimpl Console.PubSub.Cacheable, for: Console.PubSub.WorkbenchJobCreated do
  alias Console.Schema.{WorkbenchJob, ChatbotMessage}

  def cache(%@for{item: %WorkbenchJob{chatbot_message: %ChatbotMessage{} = msg}}),
    do: {:set, {:chatbot_msg, cache_id(msg)}, msg, ttl: :timer.hours(24)}
  def cache(_), do: :ok

  defp cache_id(%ChatbotMessage{external_id: id}) when is_binary(id), do: id
  defp cache_id(%ChatbotMessage{id: id}), do: id
end

defimpl Console.PubSub.Cacheable, for: [
  Console.PubSub.IssueWebhookCreated,
  Console.PubSub.IssueWebhookUpdated,
  Console.PubSub.IssueWebhookDeleted,
] do
  alias Console.Schema.IssueWebhook

  def cache(%@for{item: %IssueWebhook{external_id: ext_id} = hook}) when is_binary(ext_id),
    do: {:del, {:issue_webhook, ext_id}, hook}
  def cache(_), do: :ok
end

defimpl Console.PubSub.Cacheable, for: [
  Console.PubSub.ObservabilityWebhookCreated,
  Console.PubSub.ObservabilityWebhookUpdated,
  Console.PubSub.ObservabilityWebhookDeleted,
] do
  alias Console.Schema.ObservabilityWebhook

  def cache(%@for{item: %ObservabilityWebhook{external_id: ext_id} = hook}) when is_binary(ext_id),
    do: {:del, {:obs_webhook, ext_id}, hook}
  def cache(_), do: :ok
end

defimpl Console.PubSub.Cacheable, for: [
  Console.PubSub.PipelineUpserted,
  Console.PubSub.PipelineDeleted,
  Console.PubSub.PipelineStageUpdated,
] do
  def cache(%@for{item: _}), do: {:del, :pipelined_services, :ignore}
end

defimpl Console.PubSub.Cacheable, for: [
  Console.PubSub.PolicyUpdated,
  Console.PubSub.PolicyDeleted,
] do
  alias Console.Repo
  alias Console.Schema.{Policy, WorkbenchPolicy}

  def cache(%@for{item: %Policy{} = policy}) do
    Repo.preload(policy, :workbench_policies)
    |> Map.get(:workbench_policies)
    |> case do
      [_ | _] = assocs -> {:del, Enum.map(assocs, & {:wb_policies, &1.workbench_id}), assocs}
      _ -> :ok
    end
  end
end

defimpl Console.PubSub.Cacheable, for: [
  Console.PubSub.WorkbenchPolicyCreated,
  Console.PubSub.WorkbenchPolicyUpdated,
  Console.PubSub.WorkbenchPolicyDeleted,
] do
  alias Console.Schema.WorkbenchPolicy

  def cache(%@for{item: %WorkbenchPolicy{workbench_id: id} = policy}) when is_binary(id),
    do: {:del, {:wb_policies, id}, policy}
  def cache(_), do: :ok
end
