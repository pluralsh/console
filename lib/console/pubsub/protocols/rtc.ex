defprotocol Console.PubSub.Rtc do
  @moduledoc """
  Delivery info for rtc events
  """
  @fallback_to_any true

  @spec deliver(struct) :: term
  def deliver(event)
end

defimpl Console.PubSub.Rtc, for: Any do
  def deliver(_), do: :ok
end

defimpl Console.PubSub.Rtc, for: [
  Console.PubSub.BuildSucceeded,
  Console.PubSub.BuildFailed,
  Console.PubSub.BuildDeleted,
  Console.PubSub.BuildPending,
  Console.PubSub.BuildApproved,
  Console.PubSub.BuildUpdated,
  Console.PubSub.CommandCompleted,
  Console.PubSub.BuildCancelled,
] do
  def deliver(%{item: item}), do: {item, :update}
end

defimpl Console.PubSub.Rtc, for: [
    Console.PubSub.BuildCreated,
    Console.PubSub.CommandCreated,
    Console.PubSub.NotificationCreated
] do
  def deliver(%{item: item}), do: {item, :create}
end
