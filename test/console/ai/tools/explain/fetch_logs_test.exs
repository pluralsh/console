defmodule Console.AI.Tools.Explain.FetchLogsTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.AI.Tools.Explain.FetchLogs

  describe "changeset/2" do
    test "it can create a changeset" do
      before = DateTime.utc_now()
      changeset = FetchLogs.changeset(%FetchLogs{}, %{query: "test", before: Timex.format!(before, "{ISO:Extended}"), limit: 10})

      assert changeset.valid?
      assert changeset.changes == %{query: "test", before: before, limit: 10}
    end
  end
end
