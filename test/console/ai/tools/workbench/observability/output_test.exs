defmodule Console.AI.Tools.Workbench.OutputTest do
  use ExUnit.Case, async: true

  alias Console.AI.Tools.Workbench.Output

  test "leaves responses within the limit unchanged" do
    assert Output.truncate("metric result") == "metric result"
  end

  test "encodes and truncates JSON" do
    assert {:ok, "{\"result\":\"ok\"}"} = Output.json(%{result: "ok"})
  end

  test "limits oversized responses and explains how to retrieve more data" do
    output =
      String.duplicate("a", Output.max_bytes() + 1)
      |> Output.truncate("narrow the query or use jq to retrieve the remaining data")

    assert byte_size(output) == Output.max_bytes()
    assert output =~ "output truncated at 50 KiB"
    assert output =~ "use jq"
  end
end
