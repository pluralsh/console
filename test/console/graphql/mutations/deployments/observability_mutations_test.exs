defmodule Console.GraphQl.Deployments.ObservabilityMutationsTest do
  use Console.DataCase, async: true

  describe "upsertObservabilityProvider" do
    test "it can create a provider" do
      {:ok, %{data: %{"upsertObservabilityProvider" => provider}}} = run_query("""
        mutation Upsert($attrs: ObservabilityProviderAttributes!) {
          upsertObservabilityProvider(attributes: $attrs) {
            id
            type
            name
          }
        }
      """, %{"attrs" => %{
        "name" => "provider",
        "type" => "DATADOG",
        "credentials" => %{"datadog" => %{"apiKey" => "api", "appKey" => "app"}}
      }}, %{current_user: admin_user()})

      assert provider["name"] == "provider"
      assert provider["type"] == "DATADOG"
    end
  end

  describe "deleteObservabilityProvider" do
    test "it can delete a provider" do
      provider = insert(:observability_provider)

      {:ok, %{data: %{"deleteObservabilityProvider" => deleted}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteObservabilityProvider(id: $id) { id }
        }
      """, %{"id" => provider.id}, %{current_user: admin_user()})

      assert deleted["id"] == provider.id
      refute refetch(provider)
    end
  end
end
