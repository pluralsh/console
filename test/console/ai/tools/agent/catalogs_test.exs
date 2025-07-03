defmodule Console.AI.Tools.Agent.CatalogsTest do
  use Console.DataCase, async: true
  alias Console.AI.Tools.Agent.Catalogs

  describe "implement/1" do
    test "it can fetch catalogs" do
      catalogs = insert_list(2, :catalog)

      {:ok, result} = Catalogs.implement(%Catalogs{})
      {:ok, decoded} = Jason.decode(result)

      assert ids_equal(decoded, catalogs)
    end
  end
end
