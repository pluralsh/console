defmodule Console.AI.Tools.Workbench.Canvas.MarkdownBlock do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Workbench.Canvas
  alias Console.Schema.WorkbenchJobResult.CanvasBlock

  embedded_schema do
    field :identifier, :string
    field :markdown, :string

    embeds_one :layout, CanvasBlock.Layout, on_replace: :update
  end

  @json_schema Console.priv_file!("tools/workbench/canvas/markdown.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: "add_markdown_block"
  def description(),
    do:
      "Add or replace a markdown panel on the workbench canvas. Use a stable `identifier` per panel; `layout` (x, y, w, h) is required to position and size the block in the grid."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:identifier, :markdown])
    |> cast_embed(:layout, required: true)
    |> validate_required([:markdown, :identifier])
  end

  def implement(%__MODULE__{layout: layout, markdown: markdown} = model) do
    case Canvas.insert(Canvas.canvas(), %CanvasBlock{
           identifier: model.identifier,
           type: :markdown,
           layout: layout,
           content: %CanvasBlock.Content{markdown: markdown}
         }) do
      {:ok, canvas} ->
        Canvas.save(canvas)
        {:ok, "added markdown block #{model.identifier} to canvas"}

      {:error, _} = error ->
        error
    end
  end
end
