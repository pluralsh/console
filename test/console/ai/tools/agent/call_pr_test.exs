defmodule Console.AI.Tools.Agent.CallPrTest do
  use Console.DataCase, async: true
  alias Console.AI.Tools.Agent.CallPr

  describe "implement/1" do
    test "it can fetch catalogs" do
      pr_automation = insert(:pr_automation)

      {:ok, result} = CallPr.implement(%CallPr{pr_automation_id: pr_automation.id})

      assert result.type == :pr_call
      assert result.pr_automation_id == pr_automation.id
    end
  end
end
