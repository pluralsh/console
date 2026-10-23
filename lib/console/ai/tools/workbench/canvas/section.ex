defmodule Console.AI.Tools.Workbench.Canvas.SectionBlock do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Workbench.Canvas
  alias Console.Schema.WorkbenchJobResult.CanvasBlock

  embedded_schema do
    field :identifier,  :string
    field :title,       :string
    field :description, :string
    field :position,    :integer
    field :collapsed,   :boolean, default: false
  end

  @json_schema Console.priv_file!("tools/workbench/canvas/section.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: "add_section_block"
  def description(),
    do:
      "Add or replace a collapsible section on the canvas. Blocks join it by setting `section_id` to this `identifier`; each section has its own grid starting at row 0. Sections render below unsectioned blocks, ordered by `position`."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:identifier, :title, :description, :position, :collapsed])
    |> validate_required([:identifier, :title, :position])
    |> validate_number(:position, greater_than_or_equal_to: 0)
  end

  def implement(%__MODULE__{} = model) do
    case Canvas.insert(Canvas.canvas(), %CanvasBlock{
           identifier: model.identifier,
           type: :section,
           title: model.title,
           description: model.description,
           collapsed: model.collapsed,
           layout: %CanvasBlock.Layout{x: 0, y: model.position, w: 1, h: 1}
         }) do
      {:ok, canvas} ->
        Canvas.save(canvas)
        {:ok, "added section #{model.identifier} to canvas"}

      {:error, _} = error ->
        error
    end
  end
end
