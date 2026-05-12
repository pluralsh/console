defmodule Console.AI.Tools.Workbench.Observability.TimeTest do
  use ExUnit.Case, async: true

  alias Console.AI.Tools.Workbench.Observability.Time

  describe "implement/1" do
    test "returns ok and a binary" do
      assert {:ok, ts} = Time.implement(%Time{})
      assert is_binary(ts)
    end
  end
end
