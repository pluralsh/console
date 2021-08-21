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
end
