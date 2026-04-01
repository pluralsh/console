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

  describe "monitor" do
    test "it can fetch a monitor by id" do
      monitor = insert(:monitor)

      {:ok, %{data: %{"monitor" => found}}} = run_query("""
        query Monitor($id: ID!) {
          monitor(id: $id) {
            id
            name
            threshold {
              aggregate
              value
            }
          }
        }
      """, %{"id" => monitor.id}, %{current_user: admin_user()})

      assert found["id"] == monitor.id
      assert found["name"] == monitor.name
      assert found["threshold"]["aggregate"] == "MAX"
      assert found["threshold"]["value"] == 1.0
    end
  end

  describe "serviceDeployment monitors" do
    test "it can search monitors by name" do
      service = insert(:service)
      m1 = insert(:monitor, name: "cpu-high", service: service)
      _m2 = insert(:monitor, name: "mem-high", service: service)

      {:ok, %{data: %{"serviceDeployment" => %{"monitors" => found}}}} = run_query("""
        query Monitors($id: ID!, $q: String) {
          serviceDeployment(id: $id) {
            monitors(first: 10, q: $q) {
              edges { node { id name } }
            }
          }
        }
      """, %{"id" => service.id, "q" => "cpu"}, %{current_user: admin_user()})

      monitors = from_connection(found)
      assert length(monitors) == 1
      assert hd(monitors)["id"] == m1.id
    end
  end
end
