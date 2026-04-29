defmodule Console.AI.Tools.Workbench.Canvas.TracesBlock do
  use Console.AI.Tools.Workbench.Base
  import Console.AI.Tools.Workbench.Canvas.MetricsBlock, only: [validate_tool: 3]
  alias Console.AI.Workbench.Canvas
  alias Console.AI.Tools.Workbench.Observability
  alias Console.Schema.WorkbenchJobResult.{CanvasBlock, ToolGraph}

  embedded_schema do
    field :env, :map, virtual: true
    field :identifier, :string

    embeds_one :layout, CanvasBlock.Layout, on_replace: :update
    embeds_one :props, ToolGraph, on_replace: :update
  end

  @json_schema Console.priv_file!("tools/workbench/canvas/traces.json") |> Jason.decode!()
  def json_schema(_), do: @json_schema
  def name(_), do: "add_traces_block"

  def description(_),
    do:
      "Add or replace a traces panel wired to a workbench traces tool: set `props.query.tool_name` and `props.query.tool_args` per that tool's schema. `layout` (x, y, w, h) is required; reuse `identifier` to refresh in place."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:identifier])
    |> cast_embed(:layout, required: true)
    |> cast_embed(:props, required: true)
    |> validate_required([:identifier])
  end

  @traces_tools [Observability.Traces]

  def implement(%__MODULE__{env: env, layout: layout, props: props} = model) do
    block = %CanvasBlock{
      identifier: model.identifier,
      type: :traces,
      layout: layout,
      content: %CanvasBlock.Content{traces: props}
    }

    with {:ok, _} <- validate_tool(env, props.query, @traces_tools),
         {:ok, canvas} <- Canvas.insert(Canvas.canvas(), block) do
      Canvas.save(canvas)
      {:ok, "added traces block #{model.identifier} to canvas"}
    end
  end
end
