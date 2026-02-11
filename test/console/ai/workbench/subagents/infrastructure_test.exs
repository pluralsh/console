defmodule Console.AI.Workbench.Subagents.InfrastructureTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.Workbench.{Subagents, Environment}
  alias Console.AI.{Provider, Tool, VectorStore}
  import ElasticsearchUtils

  setup :set_mimic_global

  describe "new/1" do
    test "returns an error if the job is not valid" do
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

      expect(Provider, :completion, fn _, _ ->
        {:ok, "try infrastructure", [
          %Tool{name: "__plrl__service_search", arguments: %{"query" => "error"}, id: "1"}
        ]}
      end)
      expect(VectorStore, :fetch, fn "error", _ ->
        {:ok, [
          %VectorStore.Response{
            type: :service,
            service_component: %Console.Schema.ServiceComponent.Mini{
              name: "cert-manager",
              kind: "Deployment",
              namespace: "cert-manager",
              group: "cert-manager",
              version: "v1",
              children: [],
            }
          }
        ]}
      end)
      expect(Provider, :completion, fn _, _ ->
        {:ok, "complete", [
          %Tool{name: "subagent_result", arguments: %{"output" => "complete"}}
        ]}
      end)

      workbench = insert(:workbench, configuration: %{infrastructure: %{services: true, stacks: true, kubernetes: true}})
                  |> Repo.preload(:tools)
      job = insert(:workbench_job, workbench: workbench)
      activity = insert(:workbench_job_activity, workbench_job: job, type: :infrastructure)

      result = Subagents.Infrastructure.run(activity, job, Environment.new(job, workbench.tools, []))

      assert result[:status] == :successful
      assert result[:result][:output] == "complete"
    end
  end
end
