defmodule Console.GraphQl.Deployments.GlobalQueriesTest do
  use Console.DataCase, async: true

  describe "managedNamespaces" do
    test "it can list managed namespaces" do
      ns = insert_list(3, :managed_namespace)

      {:ok, %{data: %{"managedNamespaces" => found}}} = run_query("""
        query {
          managedNamespaces(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal(ns)
    end
  end

  describe "managedNamespace" do
    test "it can fetch a managed namespace" do
      ns = insert(:managed_namespace)

      {:ok, %{data: %{"managedNamespace" => found}}} = run_query("""
        query Get($id: ID!) {
          managedNamespace(id: $id) { id }
        }
      """, %{"id" => ns.id}, %{current_user: insert(:user)})

      assert found["id"] == ns.id
    end

    test "a bound cluster can query a namespace" do
      ns = insert(:managed_namespace, target: %{tags: %{"tag" => "value"}})
      cluster = insert(:cluster, tags: [%{name: "tag", value: "value"}])

      {:ok, %{data: %{"managedNamespace" => found}}} = run_query("""
        query Get($id: ID!) {
          managedNamespace(id: $id) { id }
        }
      """, %{"id" => ns.id}, %{cluster: cluster})

      assert found["id"] == ns.id
    end

    test "non-bound clusters cannot query namespaces" do
      ns = insert(:managed_namespace, target: %{tags: %{"tag" => "value"}})
      cluster = insert(:cluster, tags: [%{name: "tag", value: "other"}])

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Get($id: ID!) {
          managedNamespace(id: $id) { id }
        }
      """, %{"id" => ns.id}, %{cluster: cluster})
    end
  end

  describe "clusterManagedNamespaces" do
    test "it can list managed namespaces for a cluster" do
      cluster = insert(:cluster, distro: :eks, tags: [%{name: "test", value: "tag"}])

      first  = insert(:managed_namespace, target: %{tags: %{"test" => "tag"}})
      second = insert(:managed_namespace, target: %{distro: :eks})
      third  = insert(:managed_namespace)
      insert(:managed_namespace, target: %{tags: %{"ignore" => "tag"}})
      insert(:managed_namespace, target: %{distro: :aks})

      {:ok, %{data: %{"clusterManagedNamespaces" => found}}} = run_query("""
        query {
          clusterManagedNamespaces(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{cluster: cluster})

      assert from_connection(found)
             |> ids_equal([first, second, third])
    end
  end
end
