defmodule Console.AI.Tools.Agent.CatalogsTest do
  use Console.DataCase, async: true
  alias Console.AI.Tools.Agent.Catalogs

  describe "implement/1" do
    test "it can fetch catalogs" do
      user = insert(:user)
      catalogs = insert_list(2, :catalog, read_bindings: [%{user_id: user.id}])

      Console.AI.Tool.context(%{user: user})

      {:ok, result} = Catalogs.implement(%Catalogs{})
      {:ok, decoded} = Jason.decode(result)

      assert ids_equal(decoded, catalogs)
    end

    test "non-readers cannot list" do
      user = insert(:user)
      insert_list(2, :catalog)

      Console.AI.Tool.context(%{user: user})

      {:ok, result} = Catalogs.implement(%Catalogs{})
      {:ok, []} = Jason.decode(result)
    end
  end
end
