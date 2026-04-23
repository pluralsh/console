defmodule Console.AI.Tools.Workbench.Canvas.MetricsBlock do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Workbench.Canvas
  alias Console.Schema.WorkbenchJobResult.{CanvasBlock, ToolGraph}

  embedded_schema do
    field :identifier, :string

    embeds_one :layout, CanvasBlock.Layout, on_replace: :update
    embeds_one :props,  ToolGraph, on_replace: :update
  end

  @json_schema Console.priv_file!("tools/workbench/canvas/metrics.json") |> Jason.decode!()
  def json_schema(), do: @json_schema
  def name(), do: "add_metrics_block"
  def description(),
    do:
      "Add or replace a metrics panel wired to a workbench metrics tool: set `props.query.tool_name` and `props.query.tool_args` per that tool's schema. `layout` (x, y, w, h) is required; reuse `identifier` to refresh in place."

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
           type: :metrics,
           layout: layout,
           content: %CanvasBlock.Content{metrics: props}
         }) do
      {:ok, canvas} ->
        Canvas.save(canvas)
        {:ok, "added metrics block #{model.identifier} to canvas"}

      {:error, _} = error ->
        error
    end
  end
end
