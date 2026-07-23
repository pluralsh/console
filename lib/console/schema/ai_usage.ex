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

  @valid_strings Map.new(@valid, &{Atom.to_string(&1), &1})

  def fields(), do: @valid

  def to_map(%__MODULE__{} = model), do: sanitize(model)

  def sanitize(%__MODULE__{} = model) do
    model
    |> Map.from_struct()
    |> Map.take(@valid)
  end

  def sanitize(%{} = attrs) do
    Enum.reduce(attrs, %{}, fn
      {key, value}, acc when is_atom(key) -> Map.put(acc, key, value)
      {key, value}, acc when is_binary(key) ->
        Map.put(acc, Map.get(@valid_strings, key, key), value)

      _, acc -> acc
    end)
    |> Map.take(@valid)
  end
  def sanitize(_), do: %{}

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(sanitize(attrs), @valid)
  end
end
