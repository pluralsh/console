defmodule Console.AI.Tools.Workbench.Infrastructure.KubeRequestToolsTest do
  use Console.DataCase, async: false
  use Mimic

  alias Console.AI.Tool
  alias Console.AI.Tools.Workbench.{KubeDrain, KubeRequest, KubeShell}
  alias Console.AI.Tools.Workbench.Infrastructure.{KubeDelete, KubeExec, KubeUpdate}
  alias Console.AI.Tools.Workbench.Infrastructure.KubeDrain, as: KubeDrainTool
  alias Console.Deployments.Clusters
  alias Console.Schema.WorkbenchJob
  alias Console.Schema.WorkbenchJob.Modes

  describe "kubernetes request policy" do
    test "rejects namespaces excluded from updates and deletes" do
      job = job_with_kubernetes_policy(exclude_namespaces: ["kube-system"])

      for tool <- [%KubeUpdate{job: job}, %KubeDelete{job: job}] do
        assert {:error, changeset} = Tool.validate(tool, attrs("kube-system"))
        assert %{namespace: [message]} = errors_on(changeset)
        assert message == "kube-system are excluded from updates"
      end
    end

    test "requires configured namespaces when a namespace is provided" do
      job = job_with_kubernetes_policy(require_namespaces: ["production"])

      for tool <- [%KubeUpdate{job: job}, %KubeDelete{job: job}] do
        assert {:error, changeset} = Tool.validate(tool, attrs("staging"))
        assert %{namespace: [message]} = errors_on(changeset)
        assert message == "is not in the required namespaces production"

        assert {:ok, _} = Tool.validate(tool, attrs(nil))
      end
    end

    test "returns kube request structs for allowed update and delete requests" do
      job = job_with_kubernetes_policy(require_namespaces: ["production"])
      cluster = insert(:cluster, handle: "cluster-a")
      approval = %Tool.Approval{reason: "approved by policy"}

      expect(Clusters, :api_discovery, 2, fn fetched_cluster ->
        assert fetched_cluster.id == cluster.id
        assert fetched_cluster.handle == "cluster-a"

        %{{"apps", "v1", "Deployment"} => "deployments"}
      end)

      assert {:ok, update} =
               Tool.validate(
                 %KubeUpdate{job: job, approval: approval},
                 attrs("production")
               )

      assert {:ok,
              %KubeRequest{
                handle: "cluster-a",
                method: "put",
                path: "/apis/apps/v1/namespaces/production/deployments/api",
                content_type: "application/json",
                query_params: %{},
                body: body,
                explanation: "Update the api deployment in production.",
                approval: ^approval
              }} = KubeUpdate.implement(update)

      assert Jason.decode!(body) == %{
               "apiVersion" => "apps/v1",
               "kind" => "Deployment",
               "metadata" => %{"name" => "api", "namespace" => "production"}
             }

      assert {:ok, delete} =
               Tool.validate(
                 %KubeDelete{job: job, approval: approval},
                 Map.delete(attrs("production"), "json")
               )

      assert {:ok,
              %KubeRequest{
                handle: "cluster-a",
                method: "delete",
                path: "/apis/apps/v1/namespaces/production/deployments/api",
                content_type: "application/json",
                explanation: "Update the api deployment in production.",
                body: nil,
                approval: ^approval
              }} = KubeDelete.implement(delete)
    end

    test "builds server-side apply requests for update operations" do
      job = job_with_kubernetes_policy(require_namespaces: ["production"])
      cluster = insert(:cluster, handle: "cluster-a")

      expect(Clusters, :api_discovery, fn fetched_cluster ->
        assert fetched_cluster.id == cluster.id
        assert fetched_cluster.handle == "cluster-a"

        %{{"apps", "v1", "Deployment"} => "deployments"}
      end)

      assert {:ok, update} =
               Tool.validate(
                 %KubeUpdate{job: job},
                 attrs("production")
                 |> Map.put("operation", "apply")
               )

      assert {:ok,
              %KubeRequest{
                handle: "cluster-a",
                method: "patch",
                path: "/apis/apps/v1/namespaces/production/deployments/api",
                content_type: "application/apply-patch+yaml",
                query_params: %{"fieldManager" => "plural"},
                body: body,
                explanation: "Update the api deployment in production."
              }} = KubeUpdate.implement(update)

      assert Jason.decode!(body) == %{
               "apiVersion" => "apps/v1",
               "kind" => "Deployment",
               "metadata" => %{"name" => "api", "namespace" => "production"}
             }
    end

    test "propagates policy approval to pod exec requests" do
      job = job_with_kubernetes_policy([])
      cluster = insert(:cluster, handle: "cluster-a")
      approval = %Tool.Approval{reason: "approved by policy"}

      assert {:ok, exec} =
               Tool.validate(
                 %KubeExec{job: job, approval: approval},
                 %{
                   "cluster" => cluster.handle,
                   "namespace" => "production",
                   "pod" => "api-0",
                   "container" => "api",
                   "command" => "cat /etc/hostname",
                   "explanation" => "Inspect the pod hostname."
                 }
               )

      assert {:ok,
              %KubeShell{
                handle: "cluster-a",
                namespace: "production",
                pod: "api-0",
                container: "api",
                command: "cat /etc/hostname",
                explanation: "Inspect the pod hostname.",
                approval: ^approval
              }} = KubeExec.implement(exec)
    end

    test "returns a kube request for draining a node" do
      job = job_with_kubernetes_policy([])
      cluster = insert(:cluster, handle: "cluster-a")
      approval = %Tool.Approval{reason: "approved by policy"}

      assert {:ok, drain} =
               Tool.validate(
                 %KubeDrainTool{job: job, approval: approval},
                 %{
                   "cluster" => cluster.handle,
                   "node" => "worker-0",
                   "explanation" => "Drain the node before maintenance."
                 }
               )

      assert {:ok,
              %KubeDrain{
                handle: "cluster-a",
                node: "worker-0",
                explanation: "Drain the node before maintenance.",
                approval: ^approval
              }} = KubeDrainTool.implement(drain)
    end
  end

  defp job_with_kubernetes_policy(kubernetes_attrs) do
    %WorkbenchJob{
      modes: %Modes{
        kubernetes: struct(Modes.Kubernetes, kubernetes_attrs)
      }
    }
  end

  defp attrs(namespace) do
    %{
      "cluster" => "cluster-a",
      "group" => "apps",
      "version" => "v1",
      "kind" => "Deployment",
      "name" => "api",
      "namespace" => namespace,
      "explanation" => "Update the api deployment in production.",
      "json" =>
        Jason.encode!(%{
          apiVersion: "apps/v1",
          kind: "Deployment",
          metadata: %{name: "api", namespace: "production"},
          status: %{readyReplicas: 1}
        })
    }
  end
end
