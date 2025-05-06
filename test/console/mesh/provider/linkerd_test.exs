defmodule Console.Mesh.Provider.LinkerdTest do
  use Console.DataCase, async: true
  alias Console.Mesh.{Provider, Edge}
  alias Prometheus.{Response, Data, Result}
  use Mimic

  describe "#graph/2" do
    test "it can fetch the graph for a cluster" do
      cluster = insert(:cluster, operational_layout: %{service_mesh: :linkerd})
      deployment_settings(prometheus_connection: %{host: "https://prom.example.com"})

      expect(Console.Mesh.Prometheus, :query, 7, fn _, _, _ ->
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
      assert edge.to.name == "nginx"
      assert edge.to.namespace == "default"

      assert trunc(s.connections) == 13324
    end
  end

  defp metric(source, destination) do
    %{
      "deployment" => "nginx",
      "namespace" => source,
      "dst_deployment" => "nginx",
      "dst_namespace" => destination
    }
  end
end
