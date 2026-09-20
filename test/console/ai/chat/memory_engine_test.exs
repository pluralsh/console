defmodule Console.AI.Chat.MemoryEngineTest do
  use ExUnit.Case, async: false
  use Mimic

  alias Console.AI.Chat.MemoryEngine
  alias Console.AI.Provider
  alias ReqLLM.{Context, Message, Response, ToolCall}

  defmodule Echo do
    use Ecto.Schema
    import Ecto.Changeset

    embedded_schema do
      field :value, :string
    end

    def name(), do: :echo
    def description(), do: "echoes a value"
    def json_schema(), do: %{type: "object", properties: %{value: %{type: "string"}}}
    def changeset(model, attrs), do: cast(model, attrs, [:value])
    def implement(%{value: value}), do: {:ok, "echo: #{value}"}
  end

  defmodule DeferredResult do
    defstruct [:tool]
  end

  defmodule Deferred do
    use Ecto.Schema
    import Ecto.Changeset
    alias Console.AI.Chat.MemoryEngineTest.DeferredResult

    embedded_schema do
      field :value, :string
    end

    def name(), do: :deferred
    def description(), do: "returns a result later"
    def json_schema(), do: %{type: "object", properties: %{value: %{type: "string"}}}
    def changeset(model, attrs), do: cast(model, attrs, [:value])
    def implement(%{id: tool}), do: {:ok, %DeferredResult{tool: tool}}
  end

  setup :set_mimic_global

  test "returns the final ReqLLM context with the reduction" do
    stub(Provider, :context_window, fn :tool -> 100_000 end)

    expect(Provider, :reqllm_completion, fn context, _opts ->
      {:ok, response(context, Context.assistant("done"), :stop)}
    end)

    reducer = fn
      [{:assistant, "done"}], _acc -> {:halt, :done}
    end

    context = Context.new([Context.user("start")])

    assert {:ok, {:done, %Context{} = context}} =
             MemoryEngine.new([], 1, system_prompt: "test", acc: [])
             |> MemoryEngine.reduce_with_context(context, reducer)

    assert Enum.map(context.messages, & &1.role) == [:system, :user, :assistant]
  end

  test "keeps resolved tool exchanges in a ReqLLM context" do
    stub(Provider, :context_window, fn :tool -> 100_000 end)

    expect(Provider, :reqllm_completion, fn context, opts ->
      assert opts[:preface] == :ignore
      assert Enum.map(context.messages, & &1.role) == [:system, :user]

      message =
        Context.assistant("calling echo",
          tool_calls: [ToolCall.new("call-1", "echo", ~s({"value":"hello"}))]
        )

      {:ok, response(context, message, :tool_calls)}
    end)

    expect(Provider, :reqllm_completion, fn context, _opts ->
      assert Enum.map(context.messages, & &1.role) == [
               :system,
               :user,
               :assistant,
               :tool
             ]

      assert %Message{role: :tool, tool_call_id: "call-1", name: "echo"} =
               List.last(context.messages)

      {:ok, response(context, Context.assistant("done"), :stop)}
    end)

    reducer = fn
      [{:assistant, "calling echo"}, {:tool, "echo: hello", %{call_id: "call-1"}}], acc ->
        {:cont, acc}

      [{:assistant, "done"}], _acc ->
        {:halt, :done}
    end

    assert {:ok, :done} =
             MemoryEngine.new([Echo], 2, system_prompt: "test", acc: [])
             |> MemoryEngine.reduce([{:user, "start"}], reducer)
  end

  test "waits to append unformatted tool results until the reducer returns them" do
    stub(Provider, :context_window, fn :tool -> 100_000 end)

    expect(Provider, :reqllm_completion, fn context, _opts ->
      message =
        Context.assistant("waiting",
          tool_calls: [ToolCall.new("call-1", "deferred", ~s({"value":"hello"}))]
        )

      {:ok, response(context, message, :tool_calls)}
    end)

    expect(Provider, :reqllm_completion, fn context, _opts ->
      assert Enum.map(context.messages, & &1.role) == [
               :system,
               :user,
               :assistant,
               :tool
             ]

      assert %Message{role: :tool, tool_call_id: "call-1", name: "deferred"} =
               List.last(context.messages)

      {:ok, response(context, Context.assistant("done"), :stop)}
    end)

    reducer = fn
      [{:assistant, "waiting"}, %DeferredResult{tool: %Console.AI.Tool{} = tool}], _acc ->
        {:message,
         {:tool, "finished later",
          %{call_id: tool.id, name: tool.name, arguments: tool.arguments}}}

      [{:assistant, "done"}], _acc ->
        {:halt, :done}
    end

    assert {:ok, :done} =
             MemoryEngine.new([Deferred], 2, system_prompt: "test", acc: [])
             |> MemoryEngine.reduce([{:user, "start"}], reducer)
  end

  test "sizes canonical messages from model payloads rather than Erlang structs" do
    stub(Provider, :context_window, fn :tool -> 40 end)

    context =
      Context.new([
        Context.system("test"),
        Context.user(String.duplicate("u", 40)),
        Context.assistant(String.duplicate("a", 40))
      ])

    assert %Context{messages: messages} =
             MemoryEngine.fit_context_window(context, "ignored")

    assert Enum.map(messages, & &1.role) == [:system, :user, :assistant]
  end

  defp response(context, message, finish_reason) do
    response = %Response{
      id: Ecto.UUID.generate(),
      model: "test:model",
      context: context,
      message: message,
      finish_reason: finish_reason,
      stream?: false
    }

    Context.merge_response(context, response)
  end
end
