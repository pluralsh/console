defmodule Console.AI.Tools.Workbench.Canvas.LogsBlock do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Workbench.Canvas
  alias Console.Schema.WorkbenchJobResult.{CanvasBlock, ToolGraph}

  embedded_schema do
    field :identifier, :string

    embeds_one :layout, CanvasBlock.Layout, on_replace: :update
    embeds_one :props,  ToolGraph, on_replace: :update
  end

  @json_schema Console.priv_file!("tools/workbench/canvas/logs.json") |> Jason.decode!()
  def json_schema(), do: @json_schema
  def name(), do: "add_logs_block"
  def description(),
    do:
      "Add or replace a logs panel wired to a workbench log tool: set `props.query.tool_name` to that tool and `props.query.tool_args` to its input. `layout` (x, y, w, h) is required; reuse `identifier` to refresh in place."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:identifier])
    |> cast_embed(:layout, required: true)
    |> cast_embed(:props, required: true)
    |> validate_required([:identifier])
  end

  def implement(%__MODULE__{layout: layout, props: props} = model) do
    case Canvas.insert(Canvas.canvas(), %CanvasBlock{
           identifier: model.identifier,
           type: :logs,
           layout: layout,
           content: %CanvasBlock.Content{logs: props}
         }) do
      {:ok, canvas} ->
        Canvas.save(canvas)
        {:ok, "added logs block #{model.identifier} to canvas"}

      {:error, _} = error ->
        error
    end
  end
end
