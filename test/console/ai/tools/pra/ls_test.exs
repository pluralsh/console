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

      {:ok, json} = Ls.implement(tool)
      {:ok, paths} = JSON.decode(json)

      expected =
        Enum.sort([
          "a.txt",
          Path.join("sub", "b.txt")
        ])

      assert Enum.sort(paths) == expected
    end

    test "filters files by regex against file contents" do
      priv_dir = :code.priv_dir(:console)
      rel_root = Path.join("test_ls_regex", Console.rand_str(12))
      root = Path.join(priv_dir, rel_root)
      File.mkdir_p!(root)

      on_exit(fn -> File.rm_rf!(root) end)

      File.write!(Path.join(root, "no_match.txt"), "alpha\nbeta\ngamma\n")
      File.mkdir_p!(Path.join(root, "nested"))

      # `Ls` compiles with `multiline: true`, so `^...$` should apply per-line.
      File.write!(Path.join([root, "nested", "match.txt"]), "first\nBARBAZ\nlast\n")
      File.write!(Path.join([root, "nested", "not_match.txt"]), "first\nBARBAZ_EXTRA\nlast\n")

      tool = %Ls{dir: priv_dir, path: rel_root, regex: "^BARBAZ$"}

      {:ok, json} = Ls.implement(tool)
      {:ok, paths} = JSON.decode(json)

      assert paths == [Path.join([rel_root, "nested", "match.txt"])]
    end

    test "rejects listing paths that escape the provided dir" do
      dir = Briefly.create!(directory: true)

      tool = %Ls{dir: dir, path: "../"}

      {:error, _} = Ls.implement(tool)
    end
  end
end
