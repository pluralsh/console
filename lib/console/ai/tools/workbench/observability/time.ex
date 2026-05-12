defmodule Console.AI.Tools.Workbench.Observability.Time do
  use Console.AI.Tools.Workbench.Base

  embedded_schema do
  end

  @json_schema Console.priv_file!("tools/empty.json") |> Jason.decode!()

  def name(), do: "current_time"
  def json_schema(), do: @json_schema
  def description(), do: "Get the current time."

  def changeset(model, attrs), do: cast(model, attrs, [])

  def implement(%__MODULE__{}) do
    Timex.now()
    |> Timex.format("{ISO:Extended}")
  end
end
