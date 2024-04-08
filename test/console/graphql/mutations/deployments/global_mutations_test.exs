defmodule Console.GraphQl.Deployments.GlobalMutationsTest do
  use Console.DataCase, async: true

  describe "createGlobalService" do
    test "it will make a service global" do
      svc = insert(:service)

      {:ok, %{data: %{"createGlobalService" => create}}} = run_query("""
        mutation Create($sid: ID!, $attrs: GlobalServiceAttributes!) {
          createGlobalService(serviceId: $sid, attributes: $attrs) {
            service { id }
            tags { name value }
          }
        }
      """, %{
        "sid" => svc.id,
        "attrs" => %{
          "name" => "test",
          "tags" => [%{"name" => "name", "value" => "value"}]
        }
      }, %{current_user: admin_user()})

      assert create["service"]["id"] == svc.id
      [tag] = create["tags"]
      assert tag["name"] == "name"
      assert tag["value"] == "value"
    end

    test "it can create a global service from a template" do
      repo = insert(:git_repository)

      {:ok, %{data: %{"createGlobalService" => create}}} = run_query("""
        mutation Create($attrs: GlobalServiceAttributes!) {
          createGlobalService(attributes: $attrs) {
            template {
              git { ref folder }
              repository { id }
            }
            tags { name value }
          }
        }
      """, %{
        "attrs" => %{
          "template" => %{"repositoryId" => repo.id, "git" => %{"ref" => "main", "folder" => "k8s"}},
          "name" => "test",
          "tags" => [%{"name" => "name", "value" => "value"}]
        }
      }, %{current_user: admin_user()})

      assert create["template"]["repository"]["id"] == repo.id
      assert create["template"]["git"]["ref"] == "main"
      assert create["template"]["git"]["folder"] == "k8s"

      [tag] = create["tags"]
      assert tag["name"] == "name"
      assert tag["value"] == "value"
    end

    test "it will make a service global by handle" do
      cluster = insert(:cluster, handle: "test")
      svc = insert(:service, cluster: cluster)

      {:ok, %{data: %{"createGlobalService" => create}}} = run_query("""
        mutation Create($cluster: String!, $name: String!, $attrs: GlobalServiceAttributes!) {
          createGlobalService(cluster: $cluster, name: $name, attributes: $attrs) {
            service { id }
            tags { name value }
          }
        }
      """, %{
        "cluster" => cluster.handle,
        "name" => svc.name,
        "attrs" => %{
          "name" => "test",
          "tags" => [%{"name" => "name", "value" => "value"}]
        }
      }, %{current_user: admin_user()})

      assert create["service"]["id"] == svc.id
      [tag] = create["tags"]
      assert tag["name"] == "name"
      assert tag["value"] == "value"
    end
  end

  describe "updateGlobalService" do
    test "it can delete a global service record" do
      global = insert(:global_service)

      {:ok, %{data: %{"updateGlobalService" => updated}}} = run_query("""
        mutation Delete($id: ID!, $attributes: GlobalServiceAttributes!) {
          updateGlobalService(id: $id, attributes: $attributes) { id distro }
        }
      """, %{"id" => global.id, "attributes" => %{"name" => global.name, "distro" => "EKS"}}, %{current_user: admin_user()})

      assert updated["id"] == global.id
      assert updated["distro"] == "EKS"
    end
  end

  describe "deleteGlobalService" do
    test "it can delete a global service record" do
      global = insert(:global_service)

      {:ok, %{data: %{"deleteGlobalService" => deleted}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteGlobalService(id: $id) { id }
        }
      """, %{"id" => global.id}, %{current_user: admin_user()})

      assert deleted["id"] == global.id
      refute refetch(global)
    end
  end

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
