defmodule Console.AI.Tools.Agent.PrAutomationsTest do
  use Console.DataCase, async: true
  alias Console.AI.Tools.Agent.PrAutomations

  describe "implement/1" do
    test "it can fetch catalogs" do
      catalog = insert(:catalog)
      pr_automations = insert_list(2, :pr_automation, catalog: catalog)

      {:ok, result} = PrAutomations.implement(%PrAutomations{catalog_id: catalog.id})
      {:ok, decoded} = Jason.decode(result)

      assert ids_equal(decoded, pr_automations)
    end
  end
end
