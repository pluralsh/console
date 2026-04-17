defmodule Console.Schema.MapJson do
  use Ecto.Type
  def type, do: :map

  def cast(""), do: {:ok, %{}}
  def cast(uri) when is_binary(uri), do: Jason.decode(uri)
  def cast(%{} = m), do: {:ok, m}
  def cast(_), do: :error

  def load(""), do: {:ok, %{}}
  def load(data) when is_map(data), do: {:ok, data}
  def load(_), do: :error

  def dump(""), do: {:ok, %{}}
  def dump(%{} = m), do: {:ok, m}
  def dump(m) when is_binary(m), do: Jason.encode(m)
  def dump(_), do: :error
end
