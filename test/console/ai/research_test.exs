defmodule Console.AI.ResearchTest do
  use Console.DataCase, async: true
  alias Console.AI.Research
  use Mimic

  describe "create_research/1" do
    test "it can create a research" do
      user = insert(:user)
      {:ok, research} = Research.create_research(%{
        prompt: "Give me a diagram of the grafana deployment",
      }, user)

      assert research.status == :pending
      assert research.user_id == user.id
      assert research.prompt == "Give me a diagram of the grafana deployment"
    end
  end

  describe "update_research/3" do
    test "it can update a research" do
      user     = insert(:user)
      research = insert(:infra_research, user: user, prompt: "Give me a diagram of the grafana deployment")

      {:ok, research} = Research.update_research(%{published: true}, research.id, user)

      assert research.published
    end

    test "users cannot update others' research" do
      research = insert(:infra_research)
      {:error, _} = Research.update_research(%{published: true}, research.id, insert(:user))
    end
  end

  describe "fix_diagram/3" do
    test "it can fix a diagram" do
      user = insert(:user)
      research = insert(:infra_research, user: user, diagram: "diagram")
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "secret"}})

      expect(ReqLLM, :generate_text, fn %{provider: :openai, model: "gpt-5.4"}, _, _ ->
        Jason.encode!(%{
          object: "response",
          output: [%{
            type: "function_call",
            call_id: "call_123",
            id: "call_123",
            status: "completed",
            name: Console.AI.Tools.Agent.FixDiagram.name(),
            arguments: Jason.encode!(%{
              diagram: "```mermaid\ngraph TD\nA --> B\n```"
            })
          }]
        })
        |> ReqLLM.Response.decode_response("openai:gpt-5.4-mini")
      end)

      {:ok, research} = Research.fix_diagram("some error message", research.id, user)

      assert research.diagram == "```mermaid\ngraph TD\nA --> B\n```"
    end
  end
end
