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

  describe "upsertObservabilityWebhook" do
    test "it can create a webhook" do
      {:ok, %{data: %{"upsertObservabilityWebhook" => webhook}}} = run_query("""
        mutation Upsert($attrs: ObservabilityWebhookAttributes!) {
          upsertObservabilityWebhook(attributes: $attrs) {
            id
            type
            name
          }
        }
      """, %{"attrs" => %{
        "name" => "webhook",
        "type" => "GRAFANA"
      }}, %{current_user: admin_user()})

      assert webhook["name"] == "webhook"
      assert webhook["type"] == "GRAFANA"
    end
  end

  describe "deleteObservabilityWebhook" do
    test "it can delete a webhook" do
      webhook = insert(:observability_webhook)

      {:ok, %{data: %{"deleteObservabilityWebhook" => deleted}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteObservabilityWebhook(id: $id) { id }
        }
      """, %{"id" => webhook.id}, %{current_user: admin_user()})

      assert deleted["id"] == webhook.id
      refute refetch(webhook)
    end
  end

  describe "createAletResolution" do
    test "it can create a resolution for an alert" do
      service = insert(:service)
      alert = insert(:alert, service: service)

      {:ok, %{data: %{"createAlertResolution" => res}}} = run_query("""
        mutation Create($id: ID!, $attrs: AlertResolutionAttributes!) {
          createAlertResolution(id: $id, attributes: $attrs) {
            resolution
            alert { id }
          }
        }
      """, %{"id" => alert.id, "attrs" => %{"resolution" => "resolved"}}, %{current_user: admin_user()})

      assert res["resolution"] == "resolved"
      assert res["alert"]["id"] == alert.id
    end
  end
end
