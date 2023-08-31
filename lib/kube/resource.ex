defmodule Kube.Resource do
  def memory(str) do
    case Regex.run(~r/^([0-9]+)([A-Za-z]{1,2})$/, str) do
      [_, int, mult] -> parse_int(int, multiplier(mult))
      _ -> {:error, "invalid memory spec #{str}"}
    end
  end

  def cpu(int) when is_integer(int), do: int * 1000
  def cpu(fl) when is_float(fl), do: floor(fl * 1000)
  def cpu(str) when is_binary(str) do
    case Regex.run(~r/^([0-9]+)m$/, str) do
      [_, int] -> parse_int(int, 1)
      _ -> parse_int(str, 1000)
    end
  end

  defp parse_int(val, mult) do
    case Float.parse(val) do
      {val, _} -> {:ok, floor(val * mult)}
      _ -> {:error, "invalid number #{val}"}
    end
  end

  defp multiplier("k"), do: 1000
  defp multiplier("M"), do: 1000 * multiplier("k")
  defp multiplier("G"), do: 1000 * multiplier("M")
  defp multiplier("T"), do: 1000 * multiplier("G")
  defp multiplier("P"), do: 1000 * multiplier("T")
  defp multiplier("E"), do: 1000 * multiplier("P")
  defp multiplier("Ki"), do: 1024
  defp multiplier("Mi"), do: 1024 * multiplier("Ki")
  defp multiplier("Gi"), do: 1024 * multiplier("Mi")
  defp multiplier("Ti"), do: 1024 * multiplier("Gi")
  defp multiplier("Pi"), do: 1024 * multiplier("Ti")
  defp multiplier("Ei"), do: 1024 * multiplier("Pi")
end
