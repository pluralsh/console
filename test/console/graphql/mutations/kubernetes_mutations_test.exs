defmodule Console.GraphQl.KubernetesMutationsTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Deployments.Clusters
  import KubernetesScaffolds

  describe "deletePod" do
    test "it can delete a pod" do
      user = insert(:user)
      svc = insert(:service, namespace: "ns", write_bindings: [%{user_id: user.id}])
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)
      expect(Kazan, :run, fn _, _ -> {:ok, pod("name")} end)

      {:ok, %{data: %{"deletePod" => status}}} = run_query("""
        mutation Del($serviceId: ID!, $namespace: String!, $name: String!) {
          deletePod(serviceId: $serviceId, namespace: $namespace, name: $name) {
            metadata { name }
            status { podIp }
            spec { nodeName }
          }
        }
      """, %{"serviceId" => svc.id, "namespace" => "ns", "name" => "name"}, %{current_user: user})

      assert status["status"]["podIp"]
      assert status["metadata"]["name"]
      assert status["spec"]["nodeName"]
    end
  end

  describe "deleteJob" do
    test "it can delete a job" do
      user = insert(:user)
      svc = insert(:service, namespace: "ns", write_bindings: [%{user_id: user.id}])
      insert(:service_component, service: svc, group: "batch", version: "v1", kind: "Job", namespace: "ns", name: "name")
      expect(Kazan, :run, fn _, _ -> {:ok, job("job")} end)
      expect(Clusters, :control_plane, fn _ -> %Kazan.Server{} end)

      {:ok, %{data: %{"deleteJob" => job}}} = run_query("""
        mutation Del($serviceId: ID!, $namespace: String!, $name: String!) {
          deleteJob(serviceId: $serviceId, namespace: $namespace, name: $name) {
            metadata { name }
            status { active }
            spec { parallelism backoffLimit }
          }
        }
      """, %{"serviceId" => svc.id, "namespace" => "ns", "name" => "name"}, %{current_user: user})

      assert job["metadata"]["name"] == "job"
      assert job["status"]["active"]
      assert job["spec"]["parallelism"] == 1
      assert job["spec"]["backoffLimit"] == 5
    end
  end
end
