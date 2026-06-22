defmodule Console.AI.Tools.Workbench.Integration.QueryTest do
  use Console.DataCase, async: true

  alias Console.AI.Tools.Workbench.Integration.Query

  describe "query_string/1" do
    test "returns an empty string for empty and non-map params" do
      assert Query.query_string(%{}) == ""
      assert Query.query_string(nil) == ""
    end

    test "encodes reserved query parameter characters" do
      assert Query.query_string(%{"head" => "pluralsh:agent/prod"}) ==
               "?head=pluralsh%3Aagent%2Fprod"

      assert Query.query_string(%{q: "source.branch.name=\"agent/prod:storage\""}) ==
               "?q=source.branch.name%3D%22agent%2Fprod%3Astorage%22"

      assert Query.query_string(%{"searchCriteria.sourceRefName" => "refs/heads/agent/prod:storage"}) ==
               "?searchCriteria.sourceRefName=refs%2Fheads%2Fagent%2Fprod%3Astorage"
    end

    test "drops nil values and stringifies atom keys" do
      assert Query.query_string(%{page: 2, ignored: nil}) == "?page=2"
    end
  end
end
