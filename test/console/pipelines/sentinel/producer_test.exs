defmodule Console.Pipelines.Sentinel.ProducerTest do
  use Console.DataCase, async: true
  alias Console.Pipelines.Sentinel.Producer

  describe "poll/1" do
    test "returns a list of unpolled sentinel runs" do
      runs = insert_list(3, :sentinel_run)

      found = Producer.poll(10)

      assert ids_equal(found, runs)
      assert Enum.all?(found, & &1.polled_at)
    end
  end
end
