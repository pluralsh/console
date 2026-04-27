defmodule Console.AI.Tools.Workbench.Canvas.MetricsBlock do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Tool
  alias Console.AI.Workbench.Canvas
  alias Console.AI.Tools.Workbench.Observability
  alias Console.AI.Workbench.Subagents
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

  @metrics_tools [Observability.Metrics, Observability.Plrl.Metrics]

  def implement(%__MODULE__{env: env,layout: layout, props: props} = model) do
    block = %CanvasBlock{
      identifier: model.identifier,
      type: :metrics,
      layout: layout,
      content: %CanvasBlock.Content{metrics: props}
    }

    with {:ok, _} <- validate_tool(env, props.query, @metrics_tools),
         {:ok, canvas} <- Canvas.insert(Canvas.canvas(), block) do
      Canvas.save(canvas)
      {:ok, "added metrics block #{model.identifier} to canvas"}
    end
  end

  def validate_tool(%Console.AI.Workbench.Environment{} = env, %ToolQuery{tool_name: name, tool_args: args}, valid_tools) do
    tools = Subagents.Observability.tools(env)
    with tool when not is_nil(tool) <- Enum.find(tools, & Tool.name(&1) == name),
         {:ok, %mod{} = t} <- Tool.validate(tool, args),
         true <- Enum.member?(valid_tools, mod) do
      {:ok, t}
    else
      {:error, err} -> {:error, "failed to validate tool call: #{name}, result: #{inspect(err)}"}
      {:ok, %{}} -> {:error, "tool #{name} not valid for querying on the fly, must be a metrics or logs capable tool"}
      nil -> {:error, "tool #{name} not found"}
      false -> {:error, "tool #{name} not a valid metrics or logs capable tool name"}
      _ -> {:error, "tool #{name} not valid for querying on the fly"}
    end
  end
end
