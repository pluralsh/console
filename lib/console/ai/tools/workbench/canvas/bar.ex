defmodule Console.AI.Tools.Workbench.Canvas.BarBlock do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Workbench.Canvas
  alias Console.Schema.WorkbenchJobResult.CanvasBlock

  embedded_schema do
    field :identifier, :string

    embeds_one :layout, CanvasBlock.Layout, on_replace: :update
    embeds_one :props, CanvasBlock.Graph, on_replace: :update
  end

  @json_schema Console.priv_file!("tools/workbench/canvas/bar.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: "add_bar_block"
  def description(),
    do:
      "Add or replace a bar chart on the canvas from labeled numeric `props.data` (Graph). `layout` (x, y, w, h) is required; reuse `identifier` to update the same chart."

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
           type: :bar,
           layout: layout,
           content: %CanvasBlock.Content{bar: props}
         }) do
      {:ok, canvas} ->
        Canvas.save(canvas)
        {:ok, "added bar block #{model.identifier} to canvas"}

      {:error, _} = error ->
        error
    end
  end
end
