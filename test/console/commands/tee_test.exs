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

    test "it works when passed into System.cmd" do
      tee = Tee.new()

      {out, _} = System.cmd("echo", ["hello world"], into: tee)

      assert Tee.output(out) == "hello world\n"
    end
  end
end
