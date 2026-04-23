defmodule Console.AI.Tools.Workbench.Canvas.Empty do
  use Console.AI.Tools.Workbench.Base
  alias Console.AI.Workbench.Canvas

  embedded_schema do
  end

  @json_schema Console.priv_file!("tools/empty.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: "recreate_canvas"
  def description(), do: "recreate the canvas you're currently working on to a fresh state"

  def changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> validate_required([])
  end

  def implement(%__MODULE__{}) do
    Canvas.empty()
    {:ok, "recreated canvas"}
  end
end
