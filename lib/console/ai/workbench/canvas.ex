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

  def empty() do
    canvas()
    |> Map.put(:blocks, %{})
    |> save()
  end

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
    with nil <- find_intersection(canvas_blocks),
         :ok <- validate_no_gaps(canvas_blocks) do
      {:ok, canvas}
    else
      {:error, _} = err -> err
      {left_id, right_id} -> {:error, "canvas blocks #{left_id} and #{right_id} have intersecting layout rectangles"}
    end
  end

  @spec validate_no_gaps([CanvasBlock.t()]) :: :ok | {:error, binary()}
  def validate_no_gaps([]), do: :ok
  def validate_no_gaps(blocks) when is_list(blocks) do
    spans = row_spans(blocks)

    with :ok <- validate_rows_present(spans),
         :ok <- validate_row_columns(spans) do
      :ok
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

  defp row_spans(blocks) do
    Enum.reduce(blocks, %{}, fn
      %CanvasBlock{layout: %CanvasBlock.Layout{x: x, y: y, w: w, h: h}}, acc
          when is_integer(x) and is_integer(y) and is_integer(w) and is_integer(h) and w > 0 and h > 0 ->
        Enum.reduce(y..(y + h - 1), acc, fn row, row_acc ->
          Map.update(row_acc, row, [{x, x + w - 1}], &[{x, x + w - 1} | &1])
        end)

      _, acc ->
        acc
    end)
  end

  defp validate_rows_present(spans) when map_size(spans) == 0, do: :ok
  defp validate_rows_present(spans) do
    rows = Map.keys(spans)
    min_row = Enum.min(rows)
    max_row = Enum.max(rows)

    case {min_row, Enum.find(min_row..max_row, &(!Map.has_key?(spans, &1)))} do
      {min, _} when min > 0 -> {:error, "canvas starts at row #{min} with no blocks before it"}
      {_, nil} -> :ok
      {_, missing} -> {:error, "canvas has a gap at row #{missing} with no blocks"}
    end
  end

  defp validate_row_columns(spans) do
    spans
    |> Enum.sort_by(fn {row, _} -> row end)
    |> Enum.reduce_while(:ok, fn {row, intervals}, _ ->
      case validate_row_coverage(row, intervals) do
        :ok -> {:cont, :ok}
        {:error, _} = err -> {:halt, err}
      end
    end)
  end

  defp validate_row_coverage(_row, []), do: :ok
  defp validate_row_coverage(row, intervals) do
    sorted = Enum.sort_by(intervals, fn {start_col, _} -> start_col end)

    case sorted do
      [{start, _} | _] when start > 0 -> {:error, "canvas row #{row} has a leading column gap before x=#{start}"}
      [{_start, first_end} | rest] ->
        Enum.reduce_while(rest, first_end, fn
            {start_col, _}, covered_end when start_col > covered_end + 1 ->
            {:halt, {:gap, covered_end, start_col}}
          {_, end_col}, covered_end -> {:cont, max(covered_end, end_col)}
        end)
        |> case do
          {:gap, gap_start, gap_end} ->
            {:error, "canvas row #{row} has an uncovered column gap between x=#{gap_start} and x=#{gap_end}"}
          _ -> :ok
        end
    end
  end
end
