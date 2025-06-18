defmodule Console.Prom.MeterTest do
  use Console.DataCase, async: true
  alias Console.Prom.Meter

  @gb 1_000_000_000

  describe "#fetch/0" do
    test "the meter can collect metrics and fetch them" do
      Meter.incr(10 * @gb)
      Meter.incr(20 * @gb)
      assert Meter.fetch() == 30

      Meter.incr(5 * @gb)
      Meter.incr(10 * @gb)
      assert Meter.fetch() == 15
    end
  end
end
