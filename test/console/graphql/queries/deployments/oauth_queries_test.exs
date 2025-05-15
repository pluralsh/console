defmodule Console.GraphQl.Deployments.OAuthQueriesTest do
  use Console.DataCase, async: true

  describe "oidcProviders" do
    test "a user can view oidc providers they are writers for" do
      user = insert(:user)
      %{group: g} = insert(:group_member, user: user)
      oidc1 = insert(:oidc_provider, write_bindings: [%{group_id: g.id}])
      oidc2 = insert(:oidc_provider, write_bindings: [%{user_id: user.id}])
      insert(:oidc_provider)

      {:ok, %{data: %{"oidcProviders" => found}}} = run_query("""
        query {
          oidcProviders(first: 5) {
            edges {
              node {
                id
                writeBindings {
                  user { id }
                  group { id }
                }
              }
            }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([oidc1, oidc2])

      assert from_connection(found)
             |> Enum.flat_map(& &1["writeBindings"])
             |> Enum.any?(& &1["user"]["id"] == user.id)
      assert from_connection(found)
             |> Enum.flat_map(& &1["writeBindings"])
             |> Enum.any?(& &1["group"]["id"] == g.id)
    end
  end
end
