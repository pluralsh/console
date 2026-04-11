defmodule Console.AI.Stream do
  alias Console.Schema.User
  alias ConsoleWeb.AIChannel

  defstruct [:topic, stream_callbacks: [], role: :assistant, offset: 0, msg: 0, index: 0, subagent: false]

  @stream {__MODULE__, :ai, :stream}
  @tool {__MODULE__, :ai, :tool}

  def enable(topic), do: Process.put(@stream, %__MODULE__{topic: topic})

  def stream(), do: Process.get(@stream)

  def tool(), do: Process.get(@tool)

  def tool(id, name, pending \\ false), do: Process.put(@tool, %{id: id, name: name, pending: pending})

  def subagent(enabled \\ true) do
    case Process.get(@stream) do
      %__MODULE__{} = s -> Process.put(@stream, %{s | subagent: enabled})
      _ -> :ok
    end
  end

  def stream_callbacks(callbacks) do
    Process.put(@stream, %__MODULE__{stream_callbacks: callbacks})
  end

  def stream(role) do
    case Process.get(@stream) do
      %__MODULE__{} = s -> %{s | role: role}
      v -> v
    end
  end

  def offset(ind) do
    Process.put(@tool, nil)
    case stream() do
      %__MODULE__{offset: off, msg: msg, index: index} = s ->
        Process.put(@stream, %{s | offset: off + max(ind, index) + 1, msg: msg + 1, index: 0})
      _ -> :ok
    end
  end

  def stream_options(%__MODULE__{stream_callbacks: [_ | _] = callbacks}),
    do: callbacks
  def stream_options(_), do: [on_result: &publish/1]

  def publish(c) do
    case stream() do
      %__MODULE__{topic: topic, offset: offset, msg: msg, role: role, index: index, subagent: false} = s ->
        Process.put(@stream, %{s | index: index + 1})
        Absinthe.Subscription.publish(
          ConsoleWeb.Endpoint,
          %{content: c, seq: index + offset, message: msg, role: role, tool: tool()},
          [ai_stream: topic]
        )
      _ -> {:error, :no_stream_configured}
    end
  end

  def thought(tool_id, content) do
    case stream() do
      %__MODULE__{topic: topic} ->
        Absinthe.Subscription.publish(
          ConsoleWeb.Endpoint,
          %{id: tool_id, content: content},
          [ai_stream: "#{topic}:tool_thoughts"]
        )
      _ -> {:error, :no_stream_configured}
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
