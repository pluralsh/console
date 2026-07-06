defmodule Console.Prom.MeterTest do
  use Console.DataCase, async: true
  alias Console.Prom.Meter
  alias ReqLLM.Response

  @gb 1_000_000_000

  describe "#fetch/0" do
    test "the meter can collect metrics and fetch them" do
      Meter.incr(10 * @gb)
      Meter.incr(20 * @gb)
      Meter.incr_tokens(response(100))
      Meter.incr_tokens(response(200))
      assert Meter.fetch() == %{bytes_ingested: 30, tokens: 300}

      Meter.incr(5 * @gb)
      Meter.incr(10 * @gb)
      Meter.incr_tokens(response(150))
      assert Meter.fetch() == %{bytes_ingested: 15, tokens: 150}
    end
  end

  defp response(total_tokens) do
    %Response{
      model: "test-model",
      id: "test-id",
      context: nil,
      usage: %{input_tokens: 0, output_tokens: total_tokens, total_tokens: total_tokens}
    }
  end
end
