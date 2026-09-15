defmodule Console.AI.PlanTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.Plan
  alias Console.AI.Tools.PlanSummary

  setup do
    {:ok, settings: deployment_settings(ai: %{
      enabled: true,
      provider: :openai,
      openai: %{access_token: "key"}
    })}
  end

  describe "comment/1" do
    test "it generates a plan summary and posts it to the pr" do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      stack = insert(:stack, repository: git, connection: insert(:scm_connection))
      run = insert(:stack_run,
        status: :pending_approval,
        stack: stack,
        repository: git,
        git: %{ref: "master", folder: "plural/terraform/aws"},
        pull_request: insert(:pull_request, url: "https://github.com/pluralsh/console/pull/10")
      )
      insert(:stack_state, run: run, plan: "some large plan")

      expect(Console.AI.OpenAI, :tool_call, fn _, _, [tool], _ ->
        assert tool == PlanSummary
        {:ok, [%Console.AI.Tool{
          name: "plural_plan_summary",
          arguments: %{
            "summary" => "summary",
            "blast_radius" => "limited blast radius",
            "critical_systems" => ["api"],
            "notable_changes" => ["update aws_instance.web"],
            "safety" => "safe to apply"
          }
        }]}
      end)
      expect(Tentacat.Pulls.Reviews, :create, fn _, _, _, _, %{"body" => body} ->
        assert body =~ "Blast Radius"
        assert body =~ "Safety Assessment"
        {:ok, %{"id" => "id"}, :ok}
      end)

      {:ok, updated} = Plan.comment(run)

      assert updated.scm_state.ai_comment_id == "id"
    end

    test "it cannot post a plan summary without a pull request" do
      run = insert(:stack_run, status: :pending_approval)
      insert(:stack_state, run: run, plan: "some large plan")

      expect(Console.AI.OpenAI, :tool_call, fn _, _, [tool], _ ->
        assert tool == PlanSummary
        {:ok, [%Console.AI.Tool{
          name: "plural_plan_summary",
          arguments: %{
            "summary" => "summary",
            "blast_radius" => "limited blast radius",
            "critical_systems" => [],
            "notable_changes" => [],
            "safety" => "safe to apply"
          }
        }]}
      end)

      {:error, "cannot post plan summary for this stack run"} = Plan.comment(run)
    end
  end

  describe "enqueue/1" do
    test "it is a no-op without a pull request" do
      run = insert(:stack_run, status: :pending_approval)
      insert(:stack_state, run: run, plan: "some large plan")

      :ok = Plan.enqueue(run)
    end
  end
end
