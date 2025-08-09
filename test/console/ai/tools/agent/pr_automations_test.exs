defmodule Console.AI.Tools.Agent.PrAutomationsTest do
  use Console.DataCase, async: true
  alias Console.AI.Tools.Agent.PrAutomations

  describe "implement/1" do
    test "it can fetch catalogs" do
      user = insert(:user)
      catalog = insert(:catalog, read_bindings: [%{user_id: user.id}])
      pr_automations = insert_list(2, :pr_automation, catalog: catalog)

      Console.AI.Tool.context(%{user: user})
      {:ok, result} = PrAutomations.implement(%PrAutomations{catalog: catalog.name})
      {:ok, decoded} = Jason.decode(result)

      assert ids_equal(decoded, pr_automations)
    end
  end
end
