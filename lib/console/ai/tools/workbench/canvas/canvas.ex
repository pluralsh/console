defmodule Console.AI.Tools.Workbench.Canvas.Canvas do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Workbench.Canvas

  embedded_schema do
  end

  @json_schema Console.priv_file!("tools/empty.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: "show_canvas"
  def description(), do: "show the canvas you're currently working on"

  def changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> validate_required([])
  end

  def implement(%__MODULE__{}) do
    Canvas.canvas()
    |> Canvas.render()
    |> Console.mapify()
    |> Console.remove_ids()
    |> Jason.encode()
  end
end
