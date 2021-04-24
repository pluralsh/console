defprotocol Console.PubSub.Webhook do
  @moduledoc """
  Delivers build status events to the configured incoming webhook
  """
  @fallback_to_any true
  @spec deliver(struct) :: {:ok, map} | :ok
  def deliver(event)
end

defimpl Console.PubSub.Webhook, for: Any do
  def deliver(_), do: :ok
end

defimpl Console.PubSub.Webhook, for: [Console.PubSub.BuildSucceeded, Console.PubSub.BuildFailed] do
  alias Console.Schema.Webhook
  def deliver(%{item: build}),
    do: {:ok, {build, Webhook.ordered()}}
end
