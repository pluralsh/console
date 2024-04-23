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
end
