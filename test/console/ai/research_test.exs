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

  describe "fix_diagram/3" do
    test "it can fix a diagram" do
      user = insert(:user)
      research = insert(:infra_research, user: user, diagram: "diagram")
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "secret"}})

      expect(HTTPoison, :post, fn _, _, _, _ ->
        {:ok, %HTTPoison.Response{status_code: 200, body: Jason.encode!(%{choices: [
          %{
            message: %{
              tool_calls: [%{
                function: %{
                  name: Console.AI.Tools.Agent.FixDiagram.name(),
                  arguments: Jason.encode!(%{
                    diagram: "```mermaid\ngraph TD\nA --> B\n```"
                  })
                }
              }]
            }
          }
        ]})}}
      end)

      {:ok, research} = Research.fix_diagram("some error message", research.id, user)

      assert research.diagram == "```mermaid\ngraph TD\nA --> B\n```"
    end
  end
end
