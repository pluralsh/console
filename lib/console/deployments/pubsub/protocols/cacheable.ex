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
