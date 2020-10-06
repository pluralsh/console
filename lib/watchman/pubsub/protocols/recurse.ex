defprotocol Watchman.PubSub.Recurse do
  @moduledoc """
  grab-bag event handling logic
  """
  @fallback_to_any true
  @spec process(struct) :: term
  def process(event)
end

defimpl Watchman.PubSub.Recurse, for: Any do
  def process(_), do: :ok
end

defimpl Watchman.PubSub.Recurse, for: Watchman.PubSub.BuildDeleted do
  def process(%{item: _}) do
    Watchman.Deployer.cancel()
  end
end

defimpl Watchman.PubSub.Recurse, for: Watchman.PubSub.BuildApproved do
  def process(%{item: _}) do
    Watchman.Runner.kick()
  end
end