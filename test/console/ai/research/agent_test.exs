defmodule Console.AI.Research.AgentTest do
  use Console.DataCase, async: false
  alias Console.AI.{Provider, Research.Agent, Tools.Agent.FinishInvestigation}
  use Mimic

  setup :set_mimic_global

  describe "start_link/1" do
    test "it can start a research agent" do
      research = insert(:infra_research)

      expect(Provider, :completion, 2, fn _, _ -> {:ok, "blah blah blah"} end)
      expect(Provider, :simple_tool_call, fn _, _, _ ->
        {:ok, %FinishInvestigation{
          summary: "blah blah blah",
          notes: ["note 1", "note 2"],
          diagram: "a diagram"
        }}
      end)

      {:ok, _} = Agent.start_monitored(research)

      assert_receive :done, :timer.seconds(10)

      research = refetch(research)
                 |> Console.Repo.preload([:threads])

      assert research.status == :completed
      assert research.analysis.summary == "blah blah blah"
      assert research.analysis.notes == ["note 1", "note 2"]
      assert research.diagram == "a diagram"
      assert length(research.threads) == 2
    end
  end
end
