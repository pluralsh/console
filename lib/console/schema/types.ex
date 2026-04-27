defmodule Console.Schema.MapJson do
  use Ecto.Type
  def type, do: :map

  def cast(""), do: {:ok, %{}}
  def cast(blob) when is_binary(blob) do
    case Jason.decode(blob) do
      {:ok, v} -> {:ok, v}
      _ -> {:error, message: "unable to decode json string"}
    end
  end
  def cast(%{} = m), do: {:ok, m}
  def cast(_), do: :error

  def load(""), do: {:ok, %{}}
  def load(data) when is_map(data), do: {:ok, data}
  def load(_), do: :error

  def dump(""), do: {:ok, %{}}
  def dump(%{} = m), do: {:ok, m}
  def dump(m) when is_binary(m) do
    case Jason.decode(m) do
      {:ok, v} -> {:ok, v}
      _ -> {:error, message: "unable to decode json string"}
    end
  end
  def dump(_), do: :error
end
