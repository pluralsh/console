defmodule Console.AI.Tools.Agent.ServiceComponentTest do
  use Console.DataCase, async: true
  use Mimic
  import ElasticsearchUtils
  alias Console.AI.Tools.Agent.ServiceComponent

  describe "implement/1" do
    test "it can fetch service components" do
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
      service = insert(:service)
      insert(:service_component, service: service)

      expect(Console.AI.VectorStore, :fetch, fn "cert manager", [filters: [datatype: {:raw, :service_component}], count: 3] ->
        {:ok, [
          %Console.AI.VectorStore.Response{
            type: :service,
            service_component: %Console.Schema.ServiceComponent.Mini{
              service_id: service.id,
              service_url: Console.url("/cd/clusters/#{service.cluster_id}/services/#{service.id}"),
              name: "cert-manager",
              kind: "Deployment",
              namespace: "cert-manager",
              group: "cert-manager",
              version: "v1",
              children: [],
              service: %{
                id: service.id,
                name: service.name
              }
            }
          }
        ]}
      end)

      {:ok, result} = ServiceComponent.implement(%ServiceComponent{query: "cert manager"})
      {:ok, [parsed]} = Jason.decode(result)

      assert parsed["service_id"] == service.id
      assert parsed["service_url"] == Console.url("/cd/clusters/#{service.cluster_id}/services/#{service.id}")
      assert parsed["name"] == "cert-manager"
      assert parsed["kind"] == "Deployment"
      assert parsed["namespace"] == "cert-manager"
      assert parsed["group"] == "cert-manager"
      assert parsed["version"] == "v1"
      assert parsed["children"] == []
    end
  end
end
