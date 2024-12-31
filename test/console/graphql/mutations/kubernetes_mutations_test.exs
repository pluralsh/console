defmodule Console.GraphQl.KubernetesMutationsTest do
  use Console.DataCase, async: true
  use Mimic
  import KubernetesScaffolds

  describe "deletePod" do
    test "it can delete a pod" do
      user = insert(:user)
      role = insert(:role, permissions: %{operate: true}, repositories: ["*"])
      insert(:role_binding, user: user, role: role)
      expect(Kazan, :run, fn _ -> {:ok, pod("name")} end)

      {:ok, %{data: %{"deletePod" => status}}} = run_query("""
        mutation Del($namespace: String!, $name: String!) {
          deletePod(namespace: $namespace, name: $name) {
            metadata { name }
            status { podIp }
            spec { nodeName }
          }
        }
      """, %{"namespace" => "ns", "name" => "name"}, %{current_user: user})

      assert status["status"]["podIp"]
      assert status["metadata"]["name"]
      assert status["spec"]["nodeName"]
    end
  end

  describe "deleteJob" do
    test "it can delete a job" do
      user = insert(:user)
      role = insert(:role, permissions: %{operate: true}, repositories: ["*"])
      insert(:role_binding, user: user, role: role)
      expect(Kazan, :run, fn _ -> {:ok, job("job")} end)

      {:ok, %{data: %{"deleteJob" => job}}} = run_query("""
        mutation Del($namespace: String!, $name: String!) {
          deleteJob(namespace: $namespace, name: $name) {
            metadata { name }
            status { active }
            spec { parallelism backoffLimit }
          }
        }
      """, %{"namespace" => "ns", "name" => "name"}, %{current_user: user})

      assert job["metadata"]["name"] == "job"
      assert job["status"]["active"]
      assert job["spec"]["parallelism"] == 1
      assert job["spec"]["backoffLimit"] == 5
    end
  end

  describe "deleteNode" do
    test "admins can delete nodes" do
      user = insert(:user, roles: %{admin: true})
      expect(Kazan, :run, fn _ -> {:ok, kube_node("node-name")} end)
      expect(Console.Commands.Plural, :terminate, fn "node-name" -> {:ok, "done"} end)

      {:ok, %{data: %{"deleteNode" => del}}} = run_query("""
        mutation Del($name: String!) {
          deleteNode(name: $name) {
            metadata { name }
          }
        }
      """, %{"name" => "node-name"}, %{current_user: user})

      assert del["metadata"]["name"] == "node-name"
    end
  end

  describe "deleteCertificate" do
    test "admins can delete certificates" do
      admin = admin_user()
      expect(Kazan, :run, fn _ -> {:ok, certificate("test")} end)

      {:ok, %{data: %{"deleteCertificate" => true}}} = run_query("""
        mutation Delete($name: String!, $namespace: String!) {
          deleteCertificate(name: $name, namespace: $namespace)
        }
      """, %{"name" => "test", "namespace" => "ns"}, %{current_user: admin})
    end

    test "nonadmins cannot delete certificates" do
      user = insert(:user)

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation Delete($name: String!, $namespace: String!) {
          deleteCertificate(name: $name, namespace: $namespace)
        }
      """, %{"name" => "test", "namespace" => "ns"}, %{current_user: user})
    end
  end
end
