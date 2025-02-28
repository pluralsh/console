defmodule Console.Deployments.ObservabilityTest do
  use Console.DataCase, async: true
  alias Console.Deployments.Observability

  describe "#upsert_provider/2" do
    test "it can create a new obs provider" do
      {:ok, provider} = Observability.upsert_provider(%{
        type: :datadog,
        name: "provider",
        credentials: %{datadog: %{app_key: "app", api_key: "api"}}
      }, admin_user())

      assert provider.type == :datadog
      assert provider.name == "provider"
      assert provider.credentials.datadog.app_key == "app"
      assert provider.credentials.datadog.api_key == "api"
    end

    test "it can update an existing obs provider" do
      existing = insert(:observability_provider)
      {:ok, provider} = Observability.upsert_provider(%{
        type: :datadog,
        name: existing.name,
        credentials: %{datadog: %{app_key: "app", api_key: "api"}}
      }, admin_user())

      assert provider.id == existing.id
      assert provider.type == :datadog
      assert provider.name == existing.name
      assert provider.credentials.datadog.app_key == "app"
      assert provider.credentials.datadog.api_key == "api"
    end

    test "nonadmins cannot upsert" do
      {:error, _} = Observability.upsert_provider(%{
        type: :datadog,
        name: "provider",
        credentials: %{datadog: %{app_id: "app", api_key: "api"}}
      }, insert(:user))
    end
  end

  describe "#delete_provider/2" do
    test "it can delete a provider by id" do
      provider = insert(:observability_provider)

      {:ok, deleted} = Observability.delete_provider(provider.id, admin_user())

      assert provider.id == deleted.id
      refute refetch(deleted)
    end

    test "nonadmins cannot delete" do
      provider = insert(:observability_provider)

      {:error, _} = Observability.delete_provider(provider.id, insert(:user))
    end
  end

  describe "#upsert_webhook/2" do
    test "it can create a new obs webhook" do
      {:ok, webhook} = Observability.upsert_webhook(%{
        type: :grafana,
        name: "webhook",
      }, admin_user())

      assert webhook.type == :grafana
      assert webhook.name == "webhook"
      assert webhook.external_id
      assert webhook.secret
    end

    test "it can update an existing obs webhook" do
      existing = insert(:observability_webhook)
      {:ok, webhook} = Observability.upsert_webhook(%{
        type: :grafana,
        name: existing.name,
        secret: "some secret"
      }, admin_user())

      assert webhook.id == existing.id
      assert webhook.type == :grafana
      assert webhook.name == existing.name
      assert webhook.secret == "some secret"
    end

    test "nonadmins cannot upsert" do
      {:error, _} = Observability.upsert_webhook(%{
        type: :datadog,
        name: "webhook",
        credentials: %{datadog: %{app_id: "app", api_key: "api"}}
      }, insert(:user))
    end
  end

  describe "#set_resolution/3" do
    test "it can set a resolution for an alert" do
      service = insert(:service)
      alert   = insert(:alert, service: service)

      {:ok, res} = Observability.set_resolution(%{
        resolution: "resolved"
      }, alert.id, admin_user())

      assert res.alert_id   == alert.id
      assert res.resolution == "resolved"
    end

    test "it can update a resolution for an alert" do
      service    = insert(:service)
      alert      = insert(:alert, service: service)
      resolution = insert(:alert_resolution, alert: alert)

      {:ok, res} = Observability.set_resolution(%{
        resolution: "updated"
      }, alert.id, admin_user())

      assert res.id         == resolution.id
      assert res.alert_id   == alert.id
      assert res.resolution == "updated"
    end

    test "non accessible users cannot update alerts" do
      service    = insert(:service)
      alert      = insert(:alert, service: service)

      {:error, _} = Observability.set_resolution(%{resolution: "updated"}, alert.id, insert(:user))
    end
  end

  describe "#delete_webhook/2" do
    test "it can delete a webhook by id" do
      webhook = insert(:observability_webhook)

      {:ok, deleted} = Observability.delete_webhook(webhook.id, admin_user())

      assert webhook.id == deleted.id
      refute refetch(deleted)
    end

    test "nonadmins cannot delete" do
      webhook = insert(:observability_webhook)

      {:error, _} = Observability.delete_webhook(webhook.id, insert(:user))
    end
  end
end
