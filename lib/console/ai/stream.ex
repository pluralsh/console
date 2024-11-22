defmodule Console.AI.Stream do
  alias Console.Schema.User

  defstruct [:topic]

  @stream {__MODULE__, :ai, :stream}

  def enable(topic), do: Process.put(@stream, %__MODULE__{topic: topic})

  def stream(), do: Process.get(@stream)

  def publish(%__MODULE__{topic: topic}, c, ind) when is_binary(topic) do
    Absinthe.Subscription.publish(
      ConsoleWeb.Endpoint,
      %{content: c, seq: ind},
      [ai_stream: topic]
    )
  end
  def publish(_, _), do: :ok

  def topic(:insight, id, %User{id: uid}), do: "ai:insight:#{id}:#{uid}"
  def topic(:thread, id, %User{id: uid}), do: "ai:thread:#{id}:#{uid}"
  def topic(:freeform, id, %User{id: uid}), do: "ai:freeform:#{id}:#{uid}"
end