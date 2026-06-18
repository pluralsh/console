defmodule Console.Prom.MeterTest do
  use Console.DataCase, async: true
  alias Console.Prom.Meter

  @gb 1_000_000_000

  describe "#fetch/0" do
    test "the meter can collect metrics and fetch them" do
      Meter.incr(10 * @gb)
      Meter.incr(20 * @gb)
      Meter.incr_tokens(100)
      Meter.incr_tokens(200)
      assert Meter.fetch() == %{bytes_ingested: 30, tokens: 300}

      Meter.incr(5 * @gb)
      Meter.incr(10 * @gb)
      Meter.incr_tokens(150)
      assert Meter.fetch() == %{bytes_ingested: 15, tokens: 150}
    end
  end
end
