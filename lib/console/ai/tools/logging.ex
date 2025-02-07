defmodule Console.AI.Tools.Logging do
  use Ecto.Schema
  import Ecto.Changeset

  embedded_schema do
    field :required, :boolean
  end

  @valid ~w(required)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/logging.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: :logging
  def description(), do: "Determines whether log information should be used to fully analyze a given kubernetes issue"

  def implement(%__MODULE__{} = logging), do: {:ok, logging}
end
