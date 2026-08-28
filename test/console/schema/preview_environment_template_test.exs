defmodule Console.Schema.PreviewEnvironmentTemplateTest do
  use Console.DataCase, async: true

  alias Console.Schema.PreviewEnvironmentTemplate

  describe "changeset/2" do
    test "parses kubernetes duration strings into seconds" do
      changeset = changeset(%{preview_ttl: "1d"})

      assert changeset.valid?
      assert changeset.changes.preview_ttl == 86_400
    end

    test "parses compound kubernetes durations" do
      changeset = changeset(%{preview_ttl: "1h30m"})

      assert changeset.valid?
      assert changeset.changes.preview_ttl == 5_400
    end

    test "parses second kubernetes durations" do
      changeset = changeset(%{preview_ttl: "5s"})

      assert changeset.valid?
      assert changeset.changes.preview_ttl == 5
    end

    test "accepts integer seconds" do
      changeset = changeset(%{preview_ttl: 120})

      assert changeset.valid?
      assert changeset.changes.preview_ttl == 120
    end

    test "rejects invalid kubernetes durations" do
      changeset = changeset(%{preview_ttl: "not-a-duration"})

      refute changeset.valid?
      assert "invalid duration" in errors_on(changeset).preview_ttl
    end
  end

  defp changeset(attrs) do
    PreviewEnvironmentTemplate.changeset(%PreviewEnvironmentTemplate{}, Map.merge(%{
      name: "preview",
      flow_id: Ecto.UUID.generate(),
      reference_service_id: Ecto.UUID.generate()
    }, attrs))
  end
end
