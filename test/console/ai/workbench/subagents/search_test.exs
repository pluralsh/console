defmodule Console.AI.Workbench.Subagents.SearchTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.{Provider, Tool}
  alias Console.AI.Workbench.{Engine, Environment, Subagents.Search}

  import ElasticsearchUtils

  setup :set_mimic_global

  describe "run/3" do
    @tag :skip
    test "uses exa MCP tool and returns subagent_result output" do
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

      exa_api_key = System.get_env("EXA_API_KEY", "test-exa-key")

      workbench =
        insert(:workbench,
          configuration: %{infrastructure: %{services: true, stacks: true, kubernetes: true}}
        )

      tool =
        insert(:workbench_tool,
          tool: :exa,
          name: "exa",
          categories: [:search],
          configuration: %{exa: %{api_key: exa_api_key}}
        )

      insert(:workbench_tool_association, workbench: workbench, tool: tool)
      job = insert(:workbench_job, workbench: workbench, prompt: "Investigate current service state")
      activity = insert(:workbench_job_activity, workbench_job: job, type: :integration, prompt: "Search for relevant status updates")

      # exa_web_search_tool = %MCPTool{
      #   tool: tool,
      #   job: job,
      #   mcp_tool: %MCPToolSpec{
      #     name: "web_search_exa",
      #     description: "Search the web with Exa",
      #     input_schema: %{"type" => "object", "properties" => %{"query" => %{"type" => "string"}}}
      #   }
      # }

      # expect(MCP, :expand_tools, fn [%{tool: :exa, name: "exa"}], ^job ->
      #   [exa_web_search_tool]
      # end)

      # expect(MCP, :invoke, fn ^tool, ^job, "web_search_exa", %{"query" => "status page"} ->
      #   {:ok, "exa search results"}
      # end)

      expect(Provider, :completion, fn _, _ ->
        {:ok, "checking web", [
          %Tool{name: "exa_exa_web_search_exa", arguments: %{"query" => "status page"}, id: "1"}
        ]}
      end)

      expect(Provider, :completion, fn msgs, _ ->
        assert Enum.any?(msgs, &match?({:tool, _, %{name: "exa_exa_web_search_exa"}}, &1))

        {:ok, "done", [
          %Tool{name: "subagent_result", arguments: %{"output" => "Found relevant web context"}, id: "2"}
        ]}
      end)

      {:ok, _engine} = Engine.new(job)
      result = Search.run(activity, job, Environment.new(job, [tool], []))

      assert result[:status] == :successful
      assert result[:result][:output] == "Found relevant web context"
    end
  end
end
