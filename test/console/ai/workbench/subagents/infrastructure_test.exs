defmodule Console.AI.Workbench.Subagents.InfrastructureTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.Workbench.{Subagents, Environment}
  alias Console.AI.{Tool, VectorStore}
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

      expect_reqllm_completion(fn _, opts ->
        %{enabled: %{tool_names: tool_names}} =
          Keyword.fetch!(opts, :plural)
          |> Enum.find(&match?(%Console.AI.Tools.ToolSearch{}, &1))

        assert "api_discovery" in tool_names
        assert "api_spec" in tool_names

        {:ok, "enabling tools", [
          %Tool{name: "enable_tools", arguments: %{"tools" => ["__plrl__service_search"]}, id: "0"}
        ]}
      end)
      expect_reqllm_completion(fn _, _ ->
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
      expect_reqllm_completion(fn _, _ ->
        {:ok, "complete", [
          %Tool{name: "enable_tools", arguments: %{"tools" => ["subagent_result"]}, id: "2"}
        ]}
      end)
      expect_reqllm_completion(fn _, _ ->
        {:ok, "complete", [
          %Tool{name: "subagent_result", arguments: %{"output" => "complete"}}
        ]}
      end)

      workbench =
        insert(:workbench, configuration: %{infrastructure: %{services: true, stacks: true, kubernetes: true}})
        |> Repo.preload(:tools)
      job = insert(:workbench_job, workbench: workbench)
      activity = insert(:workbench_job_activity, workbench_job: job, type: :infrastructure)

      result = Subagents.Infrastructure.run(activity, job, Environment.new(job, workbench.tools, []))

      assert result[:status] == :successful
      assert result[:result][:output] == "complete"
    end

    test "does not expose vector search tools when vector store is disabled" do
      deployment_settings(
        logging: %{enabled: true, driver: :elastic, elastic: es_settings()},
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{access_token: "key"},
          vector_store: %{enabled: false},
        }
      )

      expect_reqllm_completion(fn _, opts ->
        %{enabled: %{tool_names: tool_names}} =
          Keyword.fetch!(opts, :plural)
          |> Enum.find(&match?(%Console.AI.Tools.ToolSearch{}, &1))

        refute "__plrl__service_search" in tool_names
        refute "__plrl__stack_resource_search" in tool_names

        {:ok, "complete", [
          %Tool{name: "subagent_result", arguments: %{"output" => "complete"}}
        ]}
      end)

      workbench =
        insert(:workbench, configuration: %{infrastructure: %{services: true, stacks: true, kubernetes: true}})
        |> Repo.preload(:tools)
      job = insert(:workbench_job, workbench: workbench)
      activity = insert(:workbench_job_activity, workbench_job: job, type: :infrastructure)

      result = Subagents.Infrastructure.run(activity, job, Environment.new(job, workbench.tools, []))

      assert result[:status] == :successful
      assert result[:result][:output] == "complete"
    end

    test "includes docker/oci registry tools in the infrastructure toolset" do
      workbench = insert(:workbench, configuration: %{infrastructure: %{services: true}})
      docker =
        insert(:workbench_tool,
          project: workbench.project,
          tool: :docker,
          name: "dockerhub",
          configuration: %{docker: %{url: "registry-1.docker.io"}}
        )
      job = insert(:workbench_job, workbench: workbench) |> Repo.preload([:user, :workbench])
      env = Environment.new(job, [docker], [])

      names = Subagents.Infrastructure.core_tools(job, env) |> Enum.map(&Tool.name/1)

      assert "docker_dockerhub_search_tags" in names
      assert "docker_dockerhub_fetch_manifest" in names
    end

    test "includes read-only sentinel tools only when sentinels are enabled" do
      sentinel_tools = ~w(plrl_list_sentinels plrl_sentinel_runs plrl_sentinel_run plrl_sentinel_run_jobs plrl_sentinel_run_job)

      enabled = insert(:workbench, configuration: %{infrastructure: %{services: true, sentinels: true}})
      job = insert(:workbench_job, workbench: enabled) |> Repo.preload([:user, workbench: :tools])
      names = Subagents.Infrastructure.tools(job, Environment.new(job, [], [])) |> Enum.map(&Tool.name/1)

      for tool <- sentinel_tools, do: assert tool in names
      refute "plrl_run_sentinel" in names

      disabled = insert(:workbench, configuration: %{infrastructure: %{services: true}})
      job = insert(:workbench_job, workbench: disabled) |> Repo.preload([:user, workbench: :tools])
      names = Subagents.Infrastructure.tools(job, Environment.new(job, [], [])) |> Enum.map(&Tool.name/1)

      for tool <- sentinel_tools, do: refute tool in names
    end
  end
end
