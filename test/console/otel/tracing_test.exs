defmodule Console.Otel.TracingTest do
  use ExUnit.Case, async: true
  alias Console.Otel.Tracing

  describe "span/3" do
    test "returns the wrapped result" do
      assert Tracing.span("test.span", %{"k" => "v"}, fn -> {:ok, :done} end) == {:ok, :done}
    end

    test "omits nil attributes" do
      assert Tracing.span("test.span", %{"k" => nil, "keep" => "v"}, fn -> :ok end) == :ok
    end
  end
end
