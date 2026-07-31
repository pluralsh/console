defmodule Console.AI.Workbench.HeartbeatTest do
  use Console.DataCase, async: false
  alias Console.AI.Workbench.Heartbeat

  @usage %{
    input_tokens: 100,
    output_tokens: 25,
    total_tokens: 125,
    cached_tokens: 10,
    reasoning_tokens: 5,
    input_cost: 0.01,
    output_cost: 0.02,
    total_cost: 0.03
  }

  describe "usage_callback/2" do
    test "adds new usage to usage already persisted on the job" do
      job = insert(:workbench_job, status: :running, usage: @usage)
      {:ok, pid} = Heartbeat.start_link(job)
      Process.unlink(pid)

      on_exit(fn ->
        if Process.alive?(pid), do: GenServer.stop(pid, :cancel)
      end)

      Heartbeat.usage_callback(job, %{
        input_tokens: 5,
        output_tokens: 4,
        total_tokens: 9,
        cached_tokens: 1,
        reasoning_tokens: 2,
        input_cost: 0.005,
        output_cost: 0.006,
        total_cost: 0.011
      })

      %{usage: usage} = :sys.get_state(pid)

      assert usage.input_tokens == 105
      assert usage.output_tokens == 29
      assert usage.total_tokens == 134
      assert usage.cached_tokens == 11
      assert usage.reasoning_tokens == 7
      assert_in_delta usage.input_cost, 0.015, 0.000_001
      assert_in_delta usage.output_cost, 0.026, 0.000_001
      assert_in_delta usage.total_cost, 0.041, 0.000_001

      ExUnit.CaptureLog.capture_log(fn ->
        GenServer.stop(pid, :cancel)
      end)
    end

    test "persists accumulated usage when the job is cancelled" do
      job = insert(:workbench_job, status: :running)
      {:ok, pid} = Heartbeat.start_link(job)
      Process.unlink(pid)
      ref = Process.monitor(pid)

      Heartbeat.usage_callback(job, @usage)
      job
      |> Console.Schema.WorkbenchJob.changeset(%{status: :cancelled})
      |> Console.Repo.update!()
      Heartbeat.kill(job)

      assert_receive {:DOWN, ^ref, :process, ^pid, :cancel}

      persisted_job = Console.Repo.get!(Console.Schema.WorkbenchJob, job.id)

      assert persisted_job.status == :cancelled
      assert persisted_job.usage.input_tokens == @usage.input_tokens
      assert persisted_job.usage.output_tokens == @usage.output_tokens
      assert persisted_job.usage.total_tokens == @usage.total_tokens
      assert persisted_job.usage.cached_tokens == @usage.cached_tokens
      assert persisted_job.usage.reasoning_tokens == @usage.reasoning_tokens
      assert_in_delta persisted_job.usage.input_cost, @usage.input_cost, 0.000_001
      assert_in_delta persisted_job.usage.output_cost, @usage.output_cost, 0.000_001
      assert_in_delta persisted_job.usage.total_cost, @usage.total_cost, 0.000_001
    end
  end
end
