defmodule Console.AI.Tools.Pra.ReadTest do
  use Console.DataCase, async: true

  alias Console.AI.Tools.Pra.Read

  describe "implement/2" do
    test "reads a file from the provided temp dir" do
      dir = Briefly.create!(directory: true)
      path = Path.join(dir, "file.txt")

      File.write!(path, "hello world")

      tool = %Read{dir: dir, path: "file.txt"}

      {:ok, "hello world"} = Read.implement(nil, tool)
    end

    test "rejects paths that escape the provided dir" do
      dir = Briefly.create!(directory: true)

      tool = %Read{dir: dir, path: "../outside.txt"}

      {:error, _} = Read.implement(nil, tool)
    end
  end
end
