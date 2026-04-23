defmodule Console.AI.Workbench.Canvas do
  import Console.AI.Agents.Base, only: [publish_absinthe: 2]
  alias Console.Schema.{
    WorkbenchJobActivity,
    WorkbenchJobResult.CanvasBlock
  }

  @key __MODULE__

  defstruct [:activity, blocks: %{}]

  def new(%WorkbenchJobActivity{} = activity, blocks) when is_list(blocks) do
    save(%__MODULE__{activity: activity, blocks: Map.new(blocks, & {&1.identifier, &1})})
  end

  def canvas(), do: Process.get(@key)

  def insert(%__MODULE__{activity: activity} = canvas, %CanvasBlock{identifier: id} = block) do
    put_in(canvas.blocks[id], block)
    |> validate()
    |> case do
      {:ok, block} ->
        publish_absinthe(block, [
          workbench_canvas_stream: "workbench_jobs:#{activity.workbench_job_id}:canvas_stream",
          workbench_canvas_stream: "workbench_jobs:#{activity.workbench_job_id}:#{activity.id}:canvas_stream"
        ])
        {:ok, block}
      error -> error
    end
  end

  def render(%__MODULE__{blocks: blocks}), do: Map.values(blocks)

  def validate(%__MODULE__{} = canvas) do
    canvas_blocks = Map.values(canvas.blocks)
    case find_intersection(canvas_blocks) do
      nil -> {:ok, canvas}
      {left_id, right_id} -> {:error, "canvas blocks #{left_id} and #{right_id} have intersecting layout rectangles"}
    end
  end

  def save(%__MODULE__{} = canvas) do
    Process.put(@key, canvas)
    canvas
  end

  defp find_intersection(blocks) do
    Enum.find_value(blocks, fn block ->
      case Enum.find_value(blocks, & &1.identifier != block.identifier && rectangles_intersect?(block, &1)) do
        %CanvasBlock{} = other -> {block.identifier, other.identifier}
        _ -> nil
      end
    end)
  end

  defp rectangles_intersect?(%CanvasBlock{layout: %CanvasBlock.Layout{} = a}, %CanvasBlock{layout: %CanvasBlock.Layout{} = b}) do
    # Standard rectangle intersection logic:
    # Two rectangles a and b intersect if their projections on both axes overlap.
    # Each rectangle is defined by x, y (top-left corner), width w, and height h.

    a.x < b.x + b.w and a.x + a.w > b.x and a.y < b.y + b.h and a.y + a.h > b.y
  end
  defp rectangles_intersect?(_, _), do: false
end
