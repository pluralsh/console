defmodule Console.AI.Stream do
  alias Console.Schema.User
  alias ConsoleWeb.AIChannel

  defstruct [:topic, offset: 0, msg: 0]

  @stream {__MODULE__, :ai, :stream}

  def enable(topic), do: Process.put(@stream, %__MODULE__{topic: topic})

  def stream(), do: Process.get(@stream)

  def offset(ind) do
    case stream() do
      %__MODULE__{offset: off, msg: msg} = s ->
        Process.put(@stream, %{s | offset: off + ind + 1, msg: msg + 1})
      _ -> :ok
    end
  end

  def publish(%__MODULE__{topic: topic, offset: offset, msg: msg}, c, ind) when is_binary(topic) do
    msg = %{content: c, seq: ind + offset, message: msg}
    AIChannel.stream(topic, msg)
    Absinthe.Subscription.publish(
      ConsoleWeb.Endpoint,
      msg,
      [ai_stream: topic]
    )
  end
  def publish(_, _, _), do: :ok

  def topic(:insight, id, %User{id: uid}), do: "ai:insight:#{id}:#{uid}"
  def topic(:thread, id, %User{id: uid}), do: "ai:thread:#{id}:#{uid}"
  def topic(:freeform, id, %User{id: uid}), do: "ai:freeform:#{id}:#{uid}"
end
