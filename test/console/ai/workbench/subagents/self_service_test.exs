defmodule Console.AI.Workbench.Subagents.SelfServiceTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.Tool
  alias Console.AI.Workbench.{Engine, Environment, Subagents.SelfService}
  alias Console.AI.Tools.Workbench.SelfService.InvokePrAutomation
  alias Console.Deployments.Pr.Dispatcher

  setup :set_mimic_global

  describe "run/3" do
    test "invokes a PR automation and returns subagent_result output" do
      deployment_settings(ai: %{
        enabled: true,
        provider: :openai,
        openai: %{access_token: "key"}
      })

      user = insert(:user)
      workbench = insert(:workbench, configuration: %{self_service: true})
      job = insert(:workbench_job, workbench: workbench, user: user, prompt: "Provision postgres")
      activity = insert(:workbench_job_activity, workbench_job: job, type: :self_service, prompt: "Find and invoke the postgres automation")
      catalog = insert(:catalog, name: "databases", read_bindings: [%{user_id: user.id}])
      pra = insert(:pr_automation,
        name: "postgres",
        catalog: catalog,
        create_bindings: [%{user_id: user.id}],
        documentation: "Provision postgres"
      )

      expect(Dispatcher, :create, fn _, "plrl/postgres", _ ->
        {:ok, %{url: "https://github.com/pluralsh/console/pull/22", title: "Add postgres"}}
      end)

      expect_reqllm_completion(fn _, _ ->
        {:ok, "listing catalogs", [
          %Tool{name: "__plrl__catalogs", arguments: %{}, id: "1"}
        ]}
      end)

      expect_reqllm_completion(fn msgs, _ ->
        assert Enum.any?(msgs, &match?({:tool, _, %{name: "__plrl__catalogs"}}, &1))

        {:ok, "invoking", [
          %Tool{
            name: InvokePrAutomation.name(%InvokePrAutomation{}),
            arguments: %{
              "pr_automation_id" => pra.id,
              "branch" => "plrl/postgres",
              "context" => "{}"
            },
            id: "2"
          }
        ]}
      end)

      expect_reqllm_completion(fn msgs, _ ->
        assert Enum.any?(msgs, &match?({:tool, _, %{name: "workbench_invoke_pr_automation"}}, &1))

        {:ok, "done", [
          %Tool{name: "subagent_result", arguments: %{"output" => "Created postgres PR"}, id: "3"}
        ]}
      end)

      {:ok, _engine} = Engine.new(job)
      result = SelfService.run(activity, job, Environment.new(job, [], []))

      assert result[:status] == :successful
      assert result[:result][:output] == "Created postgres PR"
    end
  end
end
