defmodule Console.Deployments.Stacks.RunnerTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.Deployments.Stacks.{Discovery}

  setup :set_mimic_global

  describe "#fetch/2" do
    test "it can checkout and tarball a subfolder of a repo" do
      bot("console")
      run = insert(:stack_run)
      insert(:observable_metric, stack: run.stack)
      expect(HTTPoison, :get, fn _, _ -> {:ok, %HTTPoison.Response{status_code: 200, body: Poison.encode!([
        %{overall_state: "Alert", message: "this is super bad"}
      ])}} end)

      {:ok, pid} = Discovery.runner(run)

      ref = Process.monitor(pid)
      assert_receive {:DOWN, ^ref, :process, _, _}

      run = refetch(run)
      assert run.status == :cancelled
      assert run.cancellation_reason == "this is super bad"

      :timer.sleep(2) # give time to clean up
    end
  end
end
