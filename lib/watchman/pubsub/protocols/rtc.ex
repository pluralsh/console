defprotocol Watchman.PubSub.Rtc do
  @moduledoc """
  Delivery info for rtc events
  """
  @fallback_to_any true

  @spec deliver(struct) :: term
  def deliver(event)
end

defimpl Watchman.PubSub.Rtc, for: Any do
  def deliver(_), do: :ok
end

defimpl Watchman.PubSub.Rtc, for: [
  Watchman.PubSub.BuildSucceeded,
  Watchman.PubSub.BuildFailed,
  Watchman.PubSub.BuildDeleted,
  Watchman.PubSub.BuildPending,
  Watchman.PubSub.BuildApproved,
  Watchman.PubSub.BuildUpdated,
  Watchman.PubSub.CommandCompleted,
  Watchman.PubSub.BuildCancelled,
  Watchman.PubSub.BuildUpdated,
] do
  def deliver(%{item: item}), do: {item, :update}
end

defimpl Watchman.PubSub.Rtc, for: [Watchman.PubSub.BuildCreated, Watchman.PubSub.CommandCreated] do
  def deliver(%{item: item}), do: {item, :create}
end
