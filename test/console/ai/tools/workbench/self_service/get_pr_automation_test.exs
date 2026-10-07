defmodule Console.AI.Tools.Workbench.SelfService.GetPrAutomationTest do
  use Console.DataCase, async: true
  alias Console.AI.Tools.Workbench.SelfService.GetPrAutomation

  describe "implement/1" do
    test "returns automation details for catalog readers" do
      user = insert(:user)
      catalog = insert(:catalog, read_bindings: [%{user_id: user.id}])
      pra = insert(:pr_automation,
        catalog: catalog,
        documentation: "Creates a managed postgres",
        title: "Add postgres",
        branch: "plrl/postgres"
      )

      Console.AI.Tool.context(%{user: user})

      {:ok, result} = GetPrAutomation.implement(%GetPrAutomation{pr_automation_id: pra.id})
      {:ok, decoded} = Jason.decode(result)

      assert decoded["id"] == pra.id
      assert decoded["documentation"] == "Creates a managed postgres"
      assert decoded["title"] == "Add postgres"
      assert decoded["branch"] == "plrl/postgres"
      assert decoded["catalog"]["id"] == catalog.id
    end

    test "supports lookup by name" do
      user = insert(:user)
      catalog = insert(:catalog, read_bindings: [%{user_id: user.id}])
      pra = insert(:pr_automation, name: "named-pra", catalog: catalog)

      Console.AI.Tool.context(%{user: user})

      {:ok, result} = GetPrAutomation.implement(%GetPrAutomation{name: "named-pra"})
      {:ok, decoded} = Jason.decode(result)

      assert decoded["id"] == pra.id
    end

    test "denies users without catalog access" do
      user = insert(:user)
      catalog = insert(:catalog)
      pra = insert(:pr_automation, catalog: catalog)

      Console.AI.Tool.context(%{user: user})

      {:ok, result} = GetPrAutomation.implement(%GetPrAutomation{pr_automation_id: pra.id})
      assert result =~ "do not have access"
    end
  end
end
