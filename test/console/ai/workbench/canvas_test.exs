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

  defp block(id, x, y, w, h) do
    %CanvasBlock{
      identifier: id,
      layout: %CanvasBlock.Layout{x: x, y: y, w: w, h: h}
    }
  end
end
