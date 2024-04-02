defmodule Console.GraphQl.Deployments.GlobalMutationsTest do
  use Console.DataCase, async: true

  describe "createManagedNamespace" do
    test "admins can create a managed namespace" do
      {:ok, %{data: %{"createManagedNamespace" => found}}} = run_query("""
        mutation Create($attrs: ManagedNamespaceAttributes!) {
          createManagedNamespace(attributes: $attrs) {
            id
            name
            labels
          }
        }
      """, %{
        "attrs" => %{"name" => "some-name", "labels" => Jason.encode!(%{"some" => "label"})}
      }, %{current_user: admin_user()})

      assert found["name"] == "some-name"
      assert found["labels"]["some"] == "label"
    end
  end

  describe "updateManagedNamespace" do
    test "admins can update a managed namespace" do
      ns = insert(:managed_namespace)
      {:ok, %{data: %{"updateManagedNamespace" => found}}} = run_query("""
        mutation Update($id: ID!, $attrs: ManagedNamespaceAttributes!) {
          updateManagedNamespace(id: $id, attributes: $attrs) {
            id
            name
            labels
          }
        }
      """, %{
        "id" => ns.id,
        "attrs" => %{"name" => "some-name", "labels" => Jason.encode!(%{"some" => "label"})}
      }, %{current_user: admin_user()})

      assert found["id"] == ns.id
      assert found["name"] == "some-name"
      assert found["labels"]["some"] == "label"
    end
  end

  describe "deleteManagedNamespace" do
    test "admins can delete a namespace" do
      ns = insert(:managed_namespace)

      {:ok, %{data: %{"deleteManagedNamespace" => deleted}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteManagedNamespace(id: $id) { id }
        }
      """, %{"id" => ns.id}, %{current_user: admin_user()})

      assert deleted["id"] == ns.id
      assert refetch(ns).deleted_at
    end
  end
end
