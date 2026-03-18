defmodule Console.Pipelines.SentinelRun.ProducerTest do
  use Console.DataCase, async: true
  alias Console.Pipelines.Sentinel.Producer

  describe "poll/1" do
    test "returns a list of unpolled sentinel runs" do
      sentinels = insert_list(3, :sentinel, next_run_at: DateTime.utc_now() |> Timex.shift(seconds: -3))
      insert_list(3, :sentinel, next_run_at: DateTime.utc_now() |> Timex.shift(seconds: 3))

      found = Producer.poll(10)

      assert ids_equal(found, sentinels)
    end
  end
end
