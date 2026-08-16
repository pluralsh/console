defmodule Console.Schema.WorkbenchPolicyTest do
  use Console.DataCase, async: true

  alias Console.Schema.WorkbenchPolicy

  describe "changeset/2" do
    test "accepts valid match regexes" do
      changeset =
        WorkbenchPolicy.changeset(%WorkbenchPolicy{}, %{
          policy_id: Ecto.UUID.generate(),
          workbench_id: Ecto.UUID.generate(),
          matches: %{regexes: ["^kubernetes\\.", "terraform/.+"]}
        })

      assert changeset.valid?
    end

    test "rejects invalid match regexes" do
      changeset =
        WorkbenchPolicy.changeset(%WorkbenchPolicy{}, %{
          policy_id: Ecto.UUID.generate(),
          workbench_id: Ecto.UUID.generate(),
          matches: %{regexes: ["^kubernetes\\.", "[invalid"]}
        })

      refute changeset.valid?
      assert {:regexes, {message, _}} = List.keyfind(changeset.changes.matches.errors, :regexes, 0)
      assert message =~ "Invalid regex [invalid"
    end
  end
end
