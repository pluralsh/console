defmodule Console.AI.Workbench.EvalTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.AI.OpenAI
  alias Console.AI.Workbench.Eval

  describe "evaluate/1" do
    test "evaluates a workbench job" do
      deployment_settings(
        logging: %{enabled: true, driver: :elastic, elastic: es_settings()},
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{access_token: "key"},
        }
      )

      job = insert(:workbench_job)
      insert_list(3, :workbench_job_activity, workbench_job: job)
      eval = insert(:workbench_eval, workbench: job.workbench)

      expect(OpenAI, :tool_call, fn _, _, _, _ ->
        {:ok, [
          %Console.AI.Tool{
            id: "1",
            name: "workbench_eval",
            arguments: %{
              "grade" => 10,
              "summary" => "Great job",
              "prompt" => "Great job",
              "result" => "Great job",
              "logic" => "Great job"
            }
          }]}
      end)

      {:ok, job_eval} = Eval.evaluate(job)

      assert job_eval.grade == 10
      assert job_eval.workbench_job_id == job.id
      assert job_eval.workbench_eval_id == eval.id
    end
  end
end
