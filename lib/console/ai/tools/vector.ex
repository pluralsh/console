defmodule Console.AI.Tools.Vector do
  use Ecto.Schema
  import Ecto.Changeset

  embedded_schema do
    field :required, :boolean
    field :query,    :string
  end

  @valid ~w(required query)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/vector.json") |> Jason.decode!()

  def json_schema(), do: @json_schema

  def name(), do: :vector

  def description() do
    "Determines how and whether you should query a vector store to extract additional data to troubleshoot a given kubernetes issue"
  end

  def implement(%__MODULE__{} = vector), do: {:ok, vector}
end
