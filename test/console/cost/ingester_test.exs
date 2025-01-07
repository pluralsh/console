defmodule Console.Cost.IngesterTest do
  use Console.DataCase, async: true
  alias Console.Cost.Ingester

  describe "#ingest/2" do
    test "it will persist all cost-relevant data" do
      cluster = insert(:cluster)
      deployment_settings(cost: %{recommendation_cushion: 10, recommendation_threshold: 2})

      cost = %{cpu: 1.0, memory: 100.0, gpu: 0.0, cpu_util: 0.5, memory_util: 20.0, gpu_util: 0.0}
      ingest = %{
        cluster: cost,
        namespaces: Enum.map([cost], &Map.put(&1, :namespace, "default")),
        recommendations: [
          %{
            type: :deployment,
            namespace: "default",
            name: "default",
            container: "nginx",
            memory_request: 10.0,
            cpu_request: 1.0,
            memory_util: 10.0,
            cpu_util: 1.0,
            cpu_cost: 1.0,
            memory_cost: 2.0,
          },
          %{
            type: :deployment,
            namespace: "default",
            name: "default-2",
            container: "nginx",
            memory_request: 10.0,
            cpu_request: 1.0,
            cpu_cost: 1.0,
            memory_cost: 0.5,
          }
        ]
      }

      {:ok, true} = Ingester.ingest(ingest, cluster)

      [usage] = Console.Repo.all(Console.Schema.ClusterUsage)
      assert usage.cluster_id == cluster.id
      assert usage.cpu         == cost[:cpu]
      assert usage.memory      == cost[:memory]
      assert usage.cpu_util    == cost[:cpu_util]
      assert usage.memory_util == cost[:memory_util]

      [ns] = Console.Repo.all(Console.Schema.ClusterNamespaceUsage)
      assert ns.cluster_id  == cluster.id
      assert ns.cpu         == cost[:cpu]
      assert ns.memory      == cost[:memory]
      assert ns.cpu_util    == cost[:cpu_util]
      assert ns.memory_util == cost[:memory_util]

      [sr] = Console.Repo.all(Console.Schema.ClusterScalingRecommendation)
      assert sr.cluster_id     == cluster.id
      assert sr.type           == :deployment
      assert sr.namespace      == "default"
      assert sr.name           == "default"
      assert sr.container      == "nginx"
      assert sr.memory_request == 10.0
      assert sr.cpu_request    == 1.0
      assert sr.memory_util    == 10.0
      assert sr.cpu_util       == 1.0

      assert sr.memory_recommendation == 11.0
      assert sr.cpu_recommendation    == 1.1
    end
  end
end
