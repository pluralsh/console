defmodule Console.MermaidValidatorTest do
  use ExUnit.Case, async: true

  alias Console.MermaidValidator

  describe "validate/1" do
    test "returns :ok for a trivially valid mermaid diagram" do
      diagram = """
      graph TD
      A --> B
      """

      assert :ok = MermaidValidator.validate(diagram)
    end

    test "returns an error tuple for an invalid mermaid diagram" do
      diagram = """
      graph TD
      A -->
      """

      assert {:error, message} = MermaidValidator.validate(diagram)
      assert is_binary(message)
      refute message == ""
    end
  end
end
