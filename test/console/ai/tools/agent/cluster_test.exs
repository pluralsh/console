defmodule Console.AI.Tools.Agent.ClusterTest do
  use Console.DataCase, async: true
  use Mimic
  import ElasticsearchUtils
  alias Console.AI.Tools.Agent.Cluster

  describe "implement/1" do
    test "it can fetch clusters" do
      deployment_settings(
        logging: %{enabled: true, driver: :elastic, elastic: es_settings()},
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{access_token: "key"},
          vector_store: %{
            enabled: true,
            store: :elastic,
            elastic: es_vector_settings(),
          },
        }
      )
      cluster = insert(:cluster)

      expect(Console.AI.VectorStore, :fetch, fn "eks cluster", [filters: [datatype: {:raw, :cluster}], count: 15] ->
        {:ok, [
          %Console.AI.VectorStore.Response{
            type: :cluster,
            cluster: %Console.Schema.Cluster.Mini{
              id: cluster.id,
              name: cluster.name,
              handle: cluster.handle,
              distro: :eks,
              cluster_url: Console.url("/cd/clusters/#{cluster.id}"),
              version: "1.28.0",
              current_version: "1.27.5",
              kubelet_version: "1.27.5",
              health_score: 85,
              node_count: 5,
              pod_count: 120,
              namespace_count: 15,
              availability_zones: ["us-east-1a", "us-east-1b"],
              runtime_services: [
                %{
                  name: "cert-manager",
                  version: "1.12.0",
                  addon: %{
                    name: "cert-manager",
                    description: "Certificate management for Kubernetes",
                    category: "security"
                  },
                  addon_version: %{
                    version: "1.12.0",
                    requirements: [],
                    blocking: false
                  }
                }
              ],
              cloud_addons: [
                %{
                  name: "vpc-cni",
                  version: "1.15.0",
                  distro: :eks,
                  info: %{description: "AWS VPC CNI plugin"},
                  version_info: %{kubernetes_version: "1.28"}
                }
              ],
              upgrade_plan: %{
                deprecations: true,
                compatibilities: true,
                incompatibilities: false,
                kubelet_skew: true
              },
              metadata: %{"environment" => "production"},
              pinged_at: ~U[2024-01-01 12:00:00Z]
            }
          }
        ]}
      end)

      {:ok, result} = Cluster.implement(%Cluster{query: "eks cluster"})
      {:ok, [parsed]} = Jason.decode(result)

      assert parsed["id"] == cluster.id
      assert parsed["name"] == cluster.name
      assert parsed["handle"] == cluster.handle
      assert parsed["distro"] == "eks"
      assert parsed["cluster_url"] == Console.url("/cd/clusters/#{cluster.id}")
      assert parsed["version"] == "1.28.0"
      assert parsed["current_version"] == "1.27.5"
      assert parsed["kubelet_version"] == "1.27.5"
      assert parsed["health_score"] == 85
      assert parsed["node_count"] == 5
      assert parsed["pod_count"] == 120
      assert parsed["namespace_count"] == 15
      assert parsed["availability_zones"] == ["us-east-1a", "us-east-1b"]
      assert [runtime_service] = parsed["runtime_services"]
      assert runtime_service["name"] == "cert-manager"
      assert runtime_service["version"] == "1.12.0"
      assert [cloud_addon] = parsed["cloud_addons"]
      assert cloud_addon["name"] == "vpc-cni"
      assert cloud_addon["version"] == "1.15.0"
      assert cloud_addon["distro"] == "eks"
      assert parsed["upgrade_plan"]["deprecations"] == true
      assert parsed["upgrade_plan"]["compatibilities"] == true
      assert parsed["upgrade_plan"]["incompatibilities"] == false
      assert parsed["upgrade_plan"]["kubelet_skew"] == true
      assert parsed["metadata"]["environment"] == "production"
    end

    test "it returns an error message when vector store is disabled" do
      deployment_settings(
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{access_token: "key"},
          vector_store: %{enabled: false}
        }
      )

      {:ok, result} = Cluster.implement(%Cluster{query: "eks cluster"})
      assert result == "Vector store is not enabled, cannot query"
    end

    test "it handles vector store errors gracefully" do
      deployment_settings(
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{access_token: "key"},
          vector_store: %{
            enabled: true,
            store: :elastic,
            elastic: es_vector_settings(),
          }
        }
      )

      expect(Console.AI.VectorStore, :fetch, fn _, _ ->
        {:error, "connection timeout"}
      end)

      {:ok, result} = Cluster.implement(%Cluster{query: "eks cluster"})
      assert result == "Error searching vector store: \"connection timeout\""
    end
  end
end
