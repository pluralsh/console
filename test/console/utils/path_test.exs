defmodule Console.Utils.PathTest do
  use ExUnit.Case
  alias Console.Utils.Path

  describe "#update/3" do
    test "it can update complex nested types" do
      nested = %{"a" => 1, "b" => "2", "c" => [%{"d" => [[1], [2, 3, %{"e" => 5}]]}]}

      {:ok, %{"a" => 1, "b" => "2", "c" => [%{"d" => [[1], [2, 3, %{"e" => 2}]]}]}} =
        Path.update(nested, ".c[0].d[1][2].e", 2)

      {:ok, %{"a" => 1, "b" => "2", "c" => [%{"d" => [[1], [2, 3, %{"e" => 2}]]}]}} =
        Path.update(nested, ".c[0].d[1][2].e", {"2", :int})

      {:ok, %{"a" => "whoa"}} = Path.update(nested, ".a", "whoa")

      {:ok, %{"a" => %{"b" => %{"c" => "hey"}}}} = Path.update(%{
        "a" => %{"b" => %{"c" => [1, 2, 3]}},
        "d" => 3,
        "hey" => "four"
      }, ".a.b.c", "hey")
    end
  end
end
