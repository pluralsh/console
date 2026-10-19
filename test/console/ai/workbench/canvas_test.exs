defmodule Console.AI.Workbench.CanvasTest do
  use Console.DataCase, async: true

  alias Console.AI.Workbench.Canvas
  alias Console.Schema.WorkbenchJobResult.CanvasBlock

  describe "validate_no_gaps/1" do
    test "returns :ok for a fully compact canvas" do
      blocks = [
        block("top_left", 0, 0, 1, 1),
        block("top_right", 1, 0, 1, 1),
        block("bottom_left", 0, 1, 1, 1),
        block("bottom_right", 1, 1, 1, 1)
      ]

      assert :ok = Canvas.validate_no_gaps(blocks)
    end

    test "returns error when canvas has missing leading rows" do
      blocks = [
        block("row_one", 0, 1, 2, 1)
      ]

      assert {:error, message} = Canvas.validate_no_gaps(blocks)
      assert message =~ "starts at row"
    end

    test "returns error when canvas has a middle column gap in a row" do
      blocks = [
        block("left", 0, 0, 1, 1),
        block("right", 2, 0, 1, 1)
      ]

      assert {:error, message} = Canvas.validate_no_gaps(blocks)
      assert message =~ "uncovered column gap"
    end

    test "returns error when canvas row has missing leading columns" do
      blocks = [
        block("offset", 1, 0, 2, 1)
      ]

      assert {:error, message} = Canvas.validate_no_gaps(blocks)
      assert message =~ "leading column gap"
    end
  end

  describe "validate/1 with sections" do
    test "validates each section as its own grid" do
      canvas = canvas([
        block("summary", 0, 0, 3, 1),
        section("saturation", 0),
        block("cpu", 0, 0, 2, 1, "saturation"),
        block("memory", 2, 0, 1, 1, "saturation")
      ])

      assert {:ok, _} = Canvas.validate(canvas)
    end

    test "allows a canvas made only of sections" do
      canvas = canvas([section("errors", 0), block("rate", 0, 0, 3, 1, "errors")])

      assert {:ok, _} = Canvas.validate(canvas)
    end

    test "reports gaps within a section" do
      canvas = canvas([section("errors", 0), block("rate", 0, 1, 3, 1, "errors")])

      assert {:error, message} = Canvas.validate(canvas)
      assert message =~ "in section errors"
      assert message =~ "starts at row"
    end

    test "rejects blocks referencing an unknown section" do
      canvas = canvas([block("rate", 0, 0, 3, 1, "missing")])

      assert {:error, message} = Canvas.validate(canvas)
      assert message =~ "unknown section missing"
    end

    test "rejects nested sections" do
      canvas = canvas([section("outer", 0), %{section("inner", 1) | section_id: "outer"}])

      assert {:error, message} = Canvas.validate(canvas)
      assert message =~ "cannot belong to another section"
    end
  end

  defp canvas(blocks), do: %Canvas{blocks: Map.new(blocks, &{&1.identifier, &1})}

  defp section(id, position) do
    %CanvasBlock{
      identifier: id,
      type: :section,
      title: id,
      layout: %CanvasBlock.Layout{x: 0, y: position, w: 1, h: 1}
    }
  end

  defp block(id, x, y, w, h, section_id \\ nil) do
    %CanvasBlock{
      identifier: id,
      section_id: section_id,
      layout: %CanvasBlock.Layout{x: x, y: y, w: w, h: h}
    }
  end
end
