defmodule Console.Schema.WorkbenchToolTest do
  use Console.DataCase, async: true
  alias Console.Schema.WorkbenchTool

  describe "changeset/2 name validation" do
    test "accepts lowercase names with internal numbers, dots, and underscores" do
      for name <- ["t", "tool", "tool_1", "tool.v2", "tool_name.v2"] do
        assert changeset(name).valid?
      end
    end

    test "rejects names that do not begin with a lowercase letter" do
      for name <- ["1tool", "_tool", ".tool", "Tool"] do
        refute changeset(name).valid?
        assert errors_on(changeset(name)).name == [validation_message()]
      end
    end

    test "rejects names that do not end with a letter or number" do
      for name <- ["tool_", "tool."] do
        refute changeset(name).valid?
        assert errors_on(changeset(name)).name == [validation_message()]
      end
    end

    test "rejects uppercase letters and unsupported punctuation" do
      for name <- ["myTool", "my-tool", "my tool"] do
        refute changeset(name).valid?
        assert errors_on(changeset(name)).name == [validation_message()]
      end
    end
  end

  defp changeset(name),
    do: WorkbenchTool.changeset(%WorkbenchTool{}, %{name: name, tool: :linear})

  defp validation_message,
    do: "must be a valid name for OpenAI tool calling: start with a lowercase letter, end with a letter or number, and contain only lowercase letters, numbers, dots, and underscores"
end
