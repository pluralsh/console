defmodule Console.AI.Stream do
  alias Console.Schema.User
  alias ConsoleWeb.AIChannel

  defstruct [:topic, :role, offset: 0, msg: 0]

  @stream {__MODULE__, :ai, :stream}
  @tool {__MODULE__, :ai, :tool}

  def enable(topic), do: Process.put(@stream, %__MODULE__{topic: topic})

  def stream(), do: Process.get(@stream)

  def tool(), do: Process.get(@tool)

  def tool(id, name), do: Process.put(@tool, %{id: id, name: name})

  def stream(role) do
    case Process.get(@stream) do
      %__MODULE__{} = s -> %{s | role: role}
      v -> v
    end
  end

  def offset(ind) do
    Process.put(@tool, nil)
    case stream() do
      %__MODULE__{offset: off, msg: msg} = s ->
        Process.put(@stream, %{s | offset: off + ind + 1, msg: msg + 1})
      _ -> :ok
    end
  end

  def publish(%__MODULE__{topic: topic, offset: offset, msg: msg, role: role}, c, ind)
    when is_binary(topic) and is_binary(c) do
    msg = %{content: c, seq: ind + offset, message: msg, role: role, tool: tool()}
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
  def topic(:cost, id, %User{id: uid}), do: "ai:cost:#{id}:#{uid}"
end
