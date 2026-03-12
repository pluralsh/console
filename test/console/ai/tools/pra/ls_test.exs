defmodule Console.AI.Tools.Pra.LsTest do
  use Console.DataCase, async: true

  alias Console.AI.Tools.Pra.Ls

  describe "implement/2" do
    test "lists files under the provided temp dir" do
      dir = Briefly.create!(directory: true)

      File.write!(Path.join(dir, "a.txt"), "one")
      File.mkdir_p!(Path.join(dir, "sub"))
      File.write!(Path.join([dir, "sub", "b.txt"]), "two")

      tool = %Ls{dir: dir, path: "."}

      assert {:ok, paths} = Ls.implement(nil, tool)

      expected =
        Enum.sort([
          "a.txt",
          Path.join("sub", "b.txt")
        ])

      assert Enum.sort(paths) == expected
    end

    test "rejects listing paths that escape the provided dir" do
      dir = Briefly.create!(directory: true)

      tool = %Ls{dir: dir, path: "../"}

      {:error, _} = Ls.implement(nil, tool)
    end
  end
end
