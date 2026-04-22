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
    publish_absinthe(block, [
      workbench_canvas_stream: "workbench_jobs:#{activity.workbench_job_id}:canvas_stream",
      workbench_canvas_stream: "workbench_jobs:#{activity.workbench_job_id}:#{activity.id}:canvas_stream"
    ])
    put_in(canvas.blocks[id], block)
    |> save()
  end

  def render(%__MODULE__{blocks: blocks}), do: Map.values(blocks)

  defp save(%__MODULE__{} = canvas) do
    Process.put(@key, canvas)
    canvas
  end
end
