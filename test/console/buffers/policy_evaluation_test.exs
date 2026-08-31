defmodule Console.Buffers.PolicyEvaluationTest do
  use Console.DataCase, async: false
  alias Console.Repo
  alias Console.Schema.PolicyEvaluation
  alias Console.Buffers.PolicyEvaluation, as: PolicyEvaluationBuffer

  describe "it will buffer policy evaluation writes" do
    test "buffering" do
      policy = insert(:policy)
      {:ok, pid} = PolicyEvaluationBuffer.start()

      PolicyEvaluationBuffer.submit(pid, evaluation(policy))
      PolicyEvaluationBuffer.submit(pid, evaluation(policy))
      PolicyEvaluationBuffer.submit(pid, evaluation(policy))
      PolicyEvaluationBuffer.submit(pid, evaluation(policy))

      :ok = PolicyEvaluationBuffer.flush(pid)

      evaluations = Repo.all(PolicyEvaluation)
      assert length(evaluations) == 4
      assert Enum.all?(evaluations, & &1.policy_ids == [policy.id])
    end

    test "flushes when the buffer reaches its size limit" do
      policy = insert(:policy)
      {:ok, pid} = PolicyEvaluationBuffer.start()

      Enum.each(1..500, fn _ ->
        PolicyEvaluationBuffer.submit(pid, evaluation(policy))
      end)

      assert %{records: [], count: 0} = :sys.get_state(pid)
      assert Repo.aggregate(PolicyEvaluation, :count) == 500
    end
  end

  defp evaluation(policy) do
    %{
      policy_ids: [policy.id],
      input: %{"tool" => "kube_update"},
      output: %{"deny" => [], "sample" => 0.5}
    }
  end
end
