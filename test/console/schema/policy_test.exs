defmodule Console.Schema.PolicyTest do
  use Console.DataCase, async: true

  alias Console.Schema.Policy

  describe "changeset/2" do
    test "accepts valid rego syntax" do
      changeset =
        Policy.changeset(%Policy{}, %{
          name: "valid-policy",
          policy: "package test\n\nallow := true",
          project_id: Ecto.UUID.generate()
        })

      assert changeset.valid?
    end

    test "rejects invalid rego syntax" do
      changeset =
        Policy.changeset(%Policy{}, %{
          name: "invalid-policy",
          policy: "package test\n\nallow {",
          project_id: Ecto.UUID.generate()
        })

      refute changeset.valid?
      assert [message] = errors_on(changeset).policy
      assert message =~ "invalid rego policy"
    end

    test "allows type changes when the policy has no attachments" do
      policy = insert(:policy)

      changeset = Policy.changeset(policy, %{type: :stack})

      assert changeset.valid?
    end

    test "rejects type changes when workbench attachments exist" do
      policy = insert(:policy)
      insert(:workbench_policy, policy: policy)

      changeset = Policy.changeset(policy, %{type: :stack})

      refute changeset.valid?
      assert errors_on(changeset).type ==
               ["cannot change type while attachments or binding rules exist"]
    end

    test "rejects type changes when the policy is used as a bind policy" do
      policy = insert(:policy, type: :binding)
      insert(:binding_policy, bind_policy: policy)

      changeset = Policy.changeset(policy, %{type: :workbench})

      refute changeset.valid?
      assert errors_on(changeset).type ==
               ["cannot change type while attachments or binding rules exist"]
    end

    test "allows setting the existing type when attachments exist" do
      policy = insert(:policy)
      insert(:workbench_policy, policy: policy)

      changeset = Policy.changeset(policy, %{type: :workbench})

      assert changeset.valid?
    end
  end

  describe "source_changeset/1" do
    test "accepts valid rego within the size bound" do
      changeset = Policy.source_changeset("package test\n\nallow := true")

      assert changeset.valid?
    end

    test "rejects invalid rego syntax" do
      changeset = Policy.source_changeset("package test\n\nallow {")

      refute changeset.valid?
      assert [message] = errors_on(changeset).policy
      assert message =~ "invalid rego policy"
    end

    test "rejects an empty buffer at compile time" do
      changeset = Policy.source_changeset("")

      refute changeset.valid?
      assert [message] = errors_on(changeset).policy
      assert message =~ "invalid rego policy"
    end

    test "rejects source over 1MB" do
      changeset = Policy.source_changeset(String.duplicate("a", 1_000_001))

      refute changeset.valid?
      assert errors_on(changeset).policy == ["should be at most 1000000 character(s)"]
    end
  end
end
