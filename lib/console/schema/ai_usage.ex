defmodule Console.Schema.AIUsage do
  use Piazza.Ecto.Schema

  embedded_schema do
    field :input_tokens,     :integer
    field :output_tokens,    :integer
    field :total_tokens,     :integer
    field :cached_tokens,    :integer
    field :reasoning_tokens, :integer
    field :input_cost,       :float
    field :output_cost,      :float
    field :total_cost,       :float
  end

  @valid ~w(
    input_tokens
    output_tokens
    total_tokens
    cached_tokens
    reasoning_tokens
    input_cost
    output_cost
    total_cost
  )a

  def to_map(%__MODULE__{} = model), do: Map.take(model, @valid)

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
  end
end
