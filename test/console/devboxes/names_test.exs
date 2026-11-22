defmodule Console.Devboxes.NamesTest do
  use ExUnit.Case, async: true
  alias Console.Devboxes.Names

  describe "#generate/1" do
    test "it generates an adjective-noun name" do
      assert Names.generate() =~ ~r/^[a-z]+-[a-z]+$/
    end

    test "it avoids taken names" do
      taken = for _ <- 1..200, do: Names.generate()
      name = Names.generate(taken)

      refute name in taken
    end
  end
end
