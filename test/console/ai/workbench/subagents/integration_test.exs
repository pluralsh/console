defmodule Console.AI.Workbench.Subagents.IntegrationTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.Workbench.{Subagents, Environment}
  alias Console.AI.Tools.Workbench.Http
  alias Console.AI.{Provider, Tool}
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
          %Tool{name: "http_integration_example", arguments: %{"input" => %{"hello" => "world"}}, id: "1"}
        ]}
      end)
      expect(Http, :implement, fn _, %Http{} -> {:ok, "http response: world (status 200)"} end)
      expect(Provider, :completion, fn _, _ ->
        {:ok, "complete", [
          %Tool{name: "subagent_result", arguments: %{"output" => "complete"}}
        ]}
      end)

      workbench = insert(:workbench, configuration: %{infrastructure: %{services: true, stacks: true, kubernetes: true}})
      tool = insert(:workbench_tool,
        tool: :http,
        name: "example",
        configuration: %{
          http: %{url: "https://example.com", method: :get, input_schema: %{"type" => "object", "properties" => %{"hello" => %{"type" => "string"}}}}
        }
      )
      insert(:workbench_tool_association, workbench: workbench, tool: tool)
      job = insert(:workbench_job, workbench: workbench)
      activity = insert(:workbench_job_activity, workbench_job: job, type: :infrastructure)

      result = Subagents.Integration.run(activity, job, Environment.new(job, [tool], []))

      assert result[:status] == :successful
      assert result[:result][:output] == "complete"
    end
  end
end
