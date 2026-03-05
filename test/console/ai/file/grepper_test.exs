defmodule Console.AI.File.GrepperTest do
  use Console.DataCase, async: true

  alias Console.AI.File.Grepper

  describe "grep/2" do
    test "returns multiline context for a single match" do
      content = fixture("sample1.txt")

      assert {:ok, [result]} = Grepper.grep(content, "ERROR one")

      # content should include surrounding lines to make it multiline
      assert String.contains?(result.content, "line before error")
      assert String.contains?(result.content, "ERROR one")
      assert String.contains?(result.content, "line after error")
      assert result.start_line < result.end_line
    end

    test "returns multiple results when there are multiple matches" do
      content = fixture("sample2.txt")

      assert {:ok, results} = Grepper.grep(content, "WARN")
      assert length(results) == 2

      Enum.each(results, fn result ->
        assert String.contains?(result.content, "WARN")
        # results should represent a multiline snippet around the match
        assert String.split(result.content, "\n") |> length() > 1
        assert result.start_line < result.end_line
      end)
    end
  end

  defp fixture(name) do
    :console
    |> :code.priv_dir()
    |> Path.join("test/grepper/#{name}")
    |> File.read!()
  end
end

