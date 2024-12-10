defmodule Console.Commands.TeeTest do
  use Console.DataCase, async: true
  alias Console.Commands.Tee

  describe "Collectible" do
    @tag :skip
    test "tee implements the collectible protocol for strings" do
      res = Enum.into(~w(one two three), Tee.new())
      assert Tee.output(res) == "onetwothree"
    end

    @tag :skip
    test "it works when passed into System.cmd" do
      tee = Tee.new()

      {out, _} = System.cmd("echo", ["hello world"], into: tee)

      assert Tee.output(out) == "hello world\n"
    end
  end
end
