defmodule Console.AI.Tools.Pra.EditTest do
  use Console.DataCase, async: true

  alias Console.AI.Tools.Pra.Edit

  describe "implement/2" do
    test "edits a file within the provided temp dir" do
      dir = Briefly.create!(directory: true)
      path = Path.join(dir, "file.txt")

      File.write!(path, "hello world")

      tool = %Edit{
        dir: dir,
        path: "file.txt",
        previous: "world",
        replacement: "there"
      }

      {:ok, _} = Edit.implement(tool)
      {:ok, result} = File.read(path)

      assert String.trim(result) == "hello there"
    end

    test "rejects edits to paths that escape the provided dir" do
      dir = Briefly.create!(directory: true)

      tool = %Edit{
        dir: dir,
        path: "../file.txt",
        previous: "world",
        replacement: "there"
      }

      {:error, _} = Edit.implement(tool)
    end
  end
end
