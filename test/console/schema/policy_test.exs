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
  end
end
