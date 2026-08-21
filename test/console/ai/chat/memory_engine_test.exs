defmodule Console.AI.Chat.MemoryEngineTest do
  use Console.DataCase, async: false
  use Mimic

  alias Console.AI.{Provider, Tool}
  alias Console.AI.Chat.MemoryEngine
  alias Console.AI.Provider.Base

  defmodule MapTool do
    use Ecto.Schema
    import Ecto.Changeset

    embedded_schema do
    end

    def name(), do: "map_tool"
    def description(), do: "returns a structured result"
    def json_schema(), do: %{"type" => "object", "properties" => %{}}
    def changeset(model, attrs), do: cast(model, attrs, [])
    def implement(_), do: {:ok, %{result: "ok", stdout: "done"}}
  end

  setup :set_mimic_global

  test "serializes structured tool results before the next completion" do
    deployment_settings(
      ai: %{
        enabled: true,
        provider: :openai,
        openai: %{access_token: "test-key", model: "gpt-5.4-mini"}
      }
    )

    expect(Provider, :completion, fn _, _ ->
      {:ok, "", [%Tool{id: "call-1", name: MapTool.name(), arguments: %{}}]}
    end)

    expect(Provider, :completion, fn messages, _ ->
      assert {:tool, content, %{call_id: "call-1", name: "map_tool", arguments: %{}}} = List.last(messages)
      assert {:ok, %{"result" => "ok", "stdout" => "done"}} = Jason.decode(content)
      assert %ReqLLM.Context{} = Base.reqllm_messages(messages)

      {:ok, "done"}
    end)

    assert {:ok, "done"} =
      MemoryEngine.new([MapTool], 2, system_prompt: "")
      |> MemoryEngine.reduce([{:user, "run the tool"}], fn messages, _ -> MemoryEngine.last_message(messages) end)
  end
end
