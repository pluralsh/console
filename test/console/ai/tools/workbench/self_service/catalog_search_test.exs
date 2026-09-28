defmodule Console.AI.Tools.Workbench.SelfService.CatalogSearchTest do
  use Console.DataCase, async: true
  alias Console.AI.Tools.Workbench.SelfService.CatalogSearch

  describe "implement/1" do
    test "falls back to name search when vector store is disabled" do
      user = insert(:user)
      catalog = insert(:catalog, name: "databases", read_bindings: [%{user_id: user.id}])
      pra = insert(:pr_automation, name: "postgres-cluster", catalog: catalog, documentation: "Provision postgres")
      insert(:pr_automation, name: "unrelated", documentation: "other")

      Console.AI.Tool.context(%{user: user})

      {:ok, result} = CatalogSearch.implement(%CatalogSearch{query: "postgres"})
      {:ok, decoded} = Jason.decode(result)

      assert Enum.any?(decoded, fn
        %{"pr_automation" => %{"id" => id}} -> id == pra.id
        _ -> false
      end)
    end

    test "hides catalogs the user cannot read" do
      user = insert(:user)
      insert(:catalog, name: "secret-catalog")

      Console.AI.Tool.context(%{user: user})

      {:ok, result} = CatalogSearch.implement(%CatalogSearch{query: "secret"})
      {:ok, decoded} = Jason.decode(result)

      assert decoded == []
    end
  end
end
