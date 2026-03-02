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
