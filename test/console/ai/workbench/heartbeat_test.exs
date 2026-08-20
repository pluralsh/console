defmodule Console.AI.Workbench.HeartbeatTest do
  use Console.DataCase, async: false
  alias Console.AI.{ModelSelection, Workbench.Heartbeat}
  alias Console.Schema.{Workbench, WorkbenchJob}
  alias Console.Schema.Workbench.Budget

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
    test "backfills missing costs using the configured tool model price sheet" do
      settings = deployment_settings(ai: %{
        enabled: true,
        provider: :openai,
        tool_provider: :anthropic,
        openai: %{tool_model: "openai-tool-model"},
        anthropic: %{tool_model: "anthropic-tool-model"},
        price_sheets: [
          %{provider: :anthropic, model: "anthropic-tool-model", input_price: 3.0, output_price: 15.0}
        ]
      })

      job = insert(:workbench_job, status: :running)
      {:ok, pid} = Heartbeat.start_link(job)
      Process.unlink(pid)

      on_exit(fn ->
        if Process.alive?(pid), do: GenServer.stop(pid, :normal)
      end)

      Heartbeat.usage_callback(
        job,
        :anthropic,
        "anthropic-tool-model",
        ModelSelection.price_sheet(settings, :anthropic, "anthropic-tool-model"),
        %{input_tokens: 1_000_000, output_tokens: 250_000}
      )

      %{usage: usage} = :sys.get_state(pid)

      assert usage.input_cost == 3.0
      assert usage.output_cost == 3.75
      assert usage.total_cost == 6.75
    end

    test "backfills missing costs using the job model override price sheet" do
      settings = deployment_settings(ai: %{
        enabled: true,
        provider: :openai,
        openai: %{tool_model: "default-tool-model"},
        price_sheets: [
          %{provider: :openai, model: "default-tool-model", input_price: 1.0, output_price: 2.0},
          %{provider: :anthropic, model: "job-tool-model", input_price: 3.0, output_price: 15.0}
        ]
      })

      job = insert(:workbench_job,
        status: :running,
        modes: %{model: %{provider: :anthropic, model: "job-tool-model"}}
      )

      {:ok, pid} = Heartbeat.start_link(job)
      Process.unlink(pid)

      on_exit(fn ->
        if Process.alive?(pid), do: GenServer.stop(pid, :normal)
      end)

      Heartbeat.usage_callback(
        job,
        :anthropic,
        "job-tool-model",
        ModelSelection.price_sheet(settings, :anthropic, "job-tool-model"),
        %{input_tokens: 1_000_000, output_tokens: 250_000}
      )

      %{usage: usage} = :sys.get_state(pid)

      assert usage.input_cost == 3.0
      assert usage.output_cost == 3.75
      assert usage.total_cost == 6.75
    end

    test "adds new usage to usage already persisted on the job" do
      job = insert(:workbench_job, status: :running, usage: @usage)
      {:ok, pid} = Heartbeat.start_link(job)
      Process.unlink(pid)

      on_exit(fn ->
        if Process.alive?(pid), do: GenServer.stop(pid, :normal)
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

      GenServer.stop(pid, :normal)
    end

    test "persists accumulated usage when the job is cancelled" do
      workbench =
        insert(:workbench,
          budget: %Budget{
            enabled: true,
            maximum: 1_000,
            min_free: 1,
            unit: :token,
            last: 1_000,
            last_updated: DateTime.utc_now()
          }
        )

      job = insert(:workbench_job, status: :running, workbench: workbench)
      {:ok, pid} = Heartbeat.start_link(job)
      Process.unlink(pid)
      ref = Process.monitor(pid)

      Heartbeat.usage_callback(job, @usage)
      job
      |> Console.Schema.WorkbenchJob.changeset(%{status: :cancelled})
      |> Console.Repo.update!()
      Heartbeat.kill(job)

      assert_receive {:DOWN, ^ref, :process, ^pid, {:shutdown, :cancel}}

      persisted_job = Console.Repo.get!(WorkbenchJob, job.id)

      assert persisted_job.status == :cancelled
      assert persisted_job.usage.input_tokens == @usage.input_tokens
      assert persisted_job.usage.output_tokens == @usage.output_tokens
      assert persisted_job.usage.total_tokens == @usage.total_tokens
      assert persisted_job.usage.cached_tokens == @usage.cached_tokens
      assert persisted_job.usage.reasoning_tokens == @usage.reasoning_tokens
      assert_in_delta persisted_job.usage.input_cost, @usage.input_cost, 0.000_001
      assert_in_delta persisted_job.usage.output_cost, @usage.output_cost, 0.000_001
      assert_in_delta persisted_job.usage.total_cost, @usage.total_cost, 0.000_001
      assert Console.Repo.get!(Workbench, workbench.id).budget.last == 875
    end

    test "terminates the linked engine process when cancelled" do
      job = insert(:workbench_job, status: :running)
      test = self()

      {engine, ref} =
        spawn_monitor(fn ->
          {:ok, heartbeat} = Heartbeat.start_link(job)
          send(test, {:heartbeat_started, heartbeat})
          Process.sleep(:infinity)
        end)

      assert_receive {:heartbeat_started, heartbeat}
      assert Process.alive?(engine)

      Heartbeat.kill(job)

      assert_receive {:DOWN, ^ref, :process, ^engine, {:shutdown, :cancel}}
      refute Process.alive?(heartbeat)
    end
  end

end
