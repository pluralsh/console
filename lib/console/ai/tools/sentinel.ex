defmodule Console.AI.Tools.Sentinel do
  use Ecto.Schema
  import Ecto.Changeset

  embedded_schema do
    field :passing, :boolean
    field :reason,  :string
  end

  def changeset(model, attrs) do
    model
    |> cast(attrs, ~w(passing reason)a)
    |> validate_required([:passing])
  end

  @json_schema Console.priv_file!("tools/sentinel.json") |> Jason.decode!()
  def json_schema(), do: @json_schema
  def name(), do: :sentinel_check
  def description(), do: "Determines whether the given check evidence is passing or failing, based on the specs already provided"

  def implement(%__MODULE__{} = model), do: {:ok, model}
end
