defmodule Console.Pipelines.Sentinel.PipelineTest do
  use Console.DataCase, async: true
  alias Console.Pipelines.Sentinel.Pipeline

  describe "handle_event/1" do
    test "creates a sentinel run" do
      sentinel = insert(:sentinel, crontab: "* * * * *")

      {:ok, run} = Pipeline.handle_event(sentinel)

      assert run.sentinel_id == sentinel.id

      sentinel = refetch(sentinel)
      assert sentinel.last_run_at
      assert sentinel.next_run_at
      assert Timex.after?(sentinel.next_run_at, Timex.now())
      assert Timex.after?(sentinel.next_run_at, sentinel.last_run_at)

      {:ok, run} = Pipeline.handle_event(sentinel)

      assert run.sentinel_id == sentinel.id

      s2 = refetch(sentinel)
      assert s2.last_run_at
      assert s2.next_run_at
      assert Timex.after?(s2.next_run_at, Timex.now())
      assert Timex.after?(s2.next_run_at, s2.last_run_at)
    end
  end
end
