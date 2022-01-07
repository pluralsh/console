defmodule Console.Commands.TeeTest do
  use Console.DataCase, async: true
  alias Console.Commands.Tee

  describe "Collectible" do
    test "tee implements the collectible protocol for strings" do
      res =
        ~w(one two three)
        |> Enum.into(Tee.new())

      assert Tee.output(res) == "onetwothree"
    end
  end
end
