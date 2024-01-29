defmodule Console.GraphQl.Deployments.BackupQueriesTest do
  use Console.DataCase, async: true

  describe "objectStores" do
    test "it can list object store connections" do
      stores = insert_list(3, :object_store)

      {:ok, %{data: %{"objectStores" => found}}} = run_query("""
        query {
          objectStores(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal(stores)
    end
  end
end
