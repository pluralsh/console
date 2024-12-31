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
