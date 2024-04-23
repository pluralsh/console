defmodule Console.GraphQl.Deployments.ObservabilityQueriesTest do
  use Console.DataCase, async: true

  describe "observabilityProvider" do
    test "it can fetch a provider" do
      provider = insert(:observability_provider)

      {:ok, %{data: %{"observabilityProvider" => found}}} = run_query("""
        query Provider($id: ID!) {
          observabilityProvider(id: $id) { id name type }
        }
      """, %{"id" => provider.id}, %{current_user: insert(:user)})

      assert found["id"] == provider.id
      assert found["type"] == "DATADOG"
      assert found["name"] == provider.name
    end
  end

  describe "observabilityProviders" do
    test "it can list providers" do
      providers = insert_list(3, :observability_provider)

      {:ok, %{data: %{"observabilityProviders" => found}}} = run_query("""
        query {
          observabilityProviders(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal(providers)
    end
  end
end
