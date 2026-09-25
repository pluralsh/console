defmodule Console.AI.Tools.Workbench.SelfService.InvokePrAutomationTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.AI.Tools.Workbench.SelfService.InvokePrAutomation
  alias Console.Deployments.Pr.Dispatcher

  describe "implement/1" do
    test "creates a pull request associated with the workbench job" do
      user = insert(:user)
      job = insert(:workbench_job, user: user)
      pra = insert(:pr_automation, create_bindings: [%{user_id: user.id}])

      expect(Dispatcher, :create, fn _, "plrl/self-service", %{"cluster" => "dev"} ->
        {:ok, %{url: "https://github.com/pluralsh/console/pull/1", title: "Provision cluster"}}
      end)

      Console.AI.Tool.context(%{user: user, job: job})

      {:ok, result} =
        InvokePrAutomation.implement(%InvokePrAutomation{
          pr_automation_id: pra.id,
          branch: "plrl/self-service",
          context: Jason.encode!(%{"cluster" => "dev"}),
          job: job
        })

      {:ok, decoded} = Jason.decode(result)

      assert decoded["url"] == "https://github.com/pluralsh/console/pull/1"
      assert decoded["title"] == "Provision cluster"
      assert decoded["workbench_job_id"] == job.id
      assert decoded["workbench_id"] == job.workbench_id
      assert decoded["status"] == "open"
    end

    test "returns permission failures without creating a pull request" do
      user = insert(:user)
      job = insert(:workbench_job, user: user)
      pra = insert(:pr_automation)

      Console.AI.Tool.context(%{user: user, job: job})

      {:ok, result} =
        InvokePrAutomation.implement(%InvokePrAutomation{
          pr_automation_id: pra.id,
          branch: "plrl/self-service",
          context: "{}",
          job: job
        })

      assert result =~ "failed to create pull request"
    end
  end
end
