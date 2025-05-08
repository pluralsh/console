defmodule Console.Mesh.Provider.CiliumTest do
  use Console.DataCase, async: true
  alias Console.Mesh.{Provider, Edge}
  alias Prometheus.{Response, Data, Result}
  use Mimic

  describe "#graph/2" do
    test "it can fetch the graph for a cluster" do
      cluster = insert(:cluster, operational_layout: %{service_mesh: :cilium})
      deployment_settings(prometheus_connection: %{host: "https://prom.example.com"})

      expect(Console.Mesh.Prometheus, :query, 6, fn _, _, _ ->
        {:ok,
          %Response{data: %Data{result: [
            %Result{metric: metric("from", "default"), value: [DateTime.utc_now(), "13324.0"]}
          ]}}
        }
      end)

      {:ok, [%Edge{statistics: s} = edge]} = Provider.graph(cluster, namespace: "default")

      assert edge.id
      assert edge.from.name == "nginx"
      assert edge.from.namespace == "from"
      assert edge.from.service == "nginx-service"
      assert edge.to.name == "nginx"
      assert edge.to.namespace == "default"
      assert edge.to.service == "nginx-service"

      assert trunc(s.bytes) == 13324
      assert trunc(s.connections) == 13324
      assert trunc(s.http200) == 13324
      assert trunc(s.http400) == 13324
      assert trunc(s.http500) == 13324
      assert trunc(s.http_client_latency) == 13324
    end
  end

  defp metric(source, destination) do
    %{
      "source.workload.name" => "nginx",
      "source.namespace.name" => source,
      "source.service.name" => "nginx-service",
      "dest.workload.name" => "nginx",
      "dest.namespace.name" => destination,
      "dest.service.name" => "nginx-service"
    }
  end
end
