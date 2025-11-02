defmodule Console.AI.ResearchTest do
  use Console.DataCase, async: true
  alias Console.AI.Research

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
end
