defmodule ConsoleWeb.CostControllerTest do
  use ConsoleWeb.ConnCase, async: true

  describe "#ingest/2" do
    test "it ingests cluster costs like ingestClusterCost", %{conn: conn} do
      cluster = insert(:cluster)
      other = insert(:cluster)
      svc = insert(:service, cluster: cluster)
      deployment_settings(cost: %{recommendation_cushion: 10})

      # whole floats arrive as json integers from the operator
      cost = %{"cpu" => 1, "memory" => 100.0, "gpu" => 0, "cpu_util" => 0.5, "memory_util" => 20, "gpu_util" => 0}
      body = %{
        "cluster" => cost,
        "namespaces" => [Map.merge(cost, %{"namespace" => "default", "cluster_id" => other.id, "node_cost" => 1.0})],
        "recommendations" => [%{
          "type" => "deployment",
          "namespace" => "default",
          "name" => "nginx",
          "container" => "nginx",
          "memory_util" => 10,
          "cpu_util" => 10,
          "service_id" => svc.id
        }]
      }

      for _ <- 1..2 do
        assert %{"ingested" => true} =
          conn
          |> add_auth_headers(cluster)
          |> post_json("/ext/v1/costs", body)
          |> json_response(200)
      end

      [usage] = Console.Repo.all(Console.Schema.ClusterUsage)
      assert usage.cluster_id == cluster.id
      assert usage.cpu == 1.0

      [ns] = Console.Repo.all(Console.Schema.ClusterNamespaceUsage)
      assert ns.cluster_id == cluster.id
      assert ns.namespace == "default"
      assert ns.cpu == 1.0
      assert ns.memory_util == 20.0

      [sr] = Console.Repo.all(Console.Schema.ClusterScalingRecommendation)
      assert sr.cluster_id == cluster.id
      assert sr.service_id == svc.id
      assert sr.type == :deployment
      assert sr.memory_recommendation
      assert sr.cpu_recommendation
    end

    test "it rejects invalid values", %{conn: conn} do
      cluster = insert(:cluster)

      conn
      |> add_auth_headers(cluster)
      |> post_json("/ext/v1/costs", %{"recommendations" => [%{"type" => "cronjob", "cpu_util" => 1.0}]})
      |> json_response(422)

      conn
      |> add_auth_headers(cluster)
      |> post_json("/ext/v1/costs", %{"namespaces" => [%{"namespace" => "default", "cpu" => "lots"}]})
      |> json_response(422)

      conn
      |> add_auth_headers(cluster)
      |> post_json("/ext/v1/costs", %{"namespaces" => "default"})
      |> json_response(400)
    end

    test "it requires a cluster token", %{conn: conn} do
      conn
      |> add_auth_headers(admin_user())
      |> post_json("/ext/v1/costs", %{})
      |> json_response(403)
    end
  end

  defp post_json(conn, path, body) do
    conn
    |> put_req_header("content-type", "application/json")
    |> post(path, Jason.encode!(body))
  end
end
