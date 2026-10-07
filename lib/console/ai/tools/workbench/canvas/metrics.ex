defmodule Console.AI.Tools.Workbench.Canvas.MetricsBlock do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Workbench.{Canvas, Toolchain}
  alias Console.Schema.WorkbenchJobResult.{CanvasBlock, ToolGraph, ToolQuery}

  embedded_schema do
    field :env, :map, virtual: true
    field :identifier, :string

    embeds_one :layout, CanvasBlock.Layout, on_replace: :update
    embeds_one :props,  ToolGraph, on_replace: :update
  end

  @json_schema Console.priv_file!("tools/workbench/canvas/metrics.json") |> Jason.decode!()
  def json_schema(_), do: @json_schema
  def name(_), do: "add_metrics_block"
  def description(_),
    do:
      "Add or replace a metrics panel wired to a workbench metrics tool: set `props.query.tool_name` and `props.query.tool_args` per that tool's schema. `layout` (x, y, w, h) is required; reuse `identifier` to refresh in place."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:identifier])
    |> cast_embed(:layout, required: true)
    |> cast_embed(:props, required: true)
    |> validate_required([:identifier])
  end

  def implement(%__MODULE__{env: env,layout: layout, props: props} = model) do
    block = %CanvasBlock{
      identifier: model.identifier,
      type: :metrics,
      layout: layout,
      content: %CanvasBlock.Content{metrics: props}
    }

    with {:ok, _} <- validate_tool(env, props.query, :metrics),
         {:ok, canvas} <- Canvas.insert(Canvas.canvas(), block) do
      Canvas.save(canvas)
      {:ok, "added metrics block #{model.identifier} to canvas"}
    end
  end

  def validate_tool(
        %Console.AI.Workbench.Environment{job: job, user: user},
        %ToolQuery{tool_name: name, tool_args: args},
        type
      ),
      do: Toolchain.validate(job, type, name, args, user)
end
