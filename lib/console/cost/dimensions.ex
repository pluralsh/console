defmodule Console.Cost.Dimensions do
  @kb 1024
  @mb @kb * @kb

  def memory(nil), do: nil
  def memory(mem) when mem > @mb, do: "#{unit(mem, @mb)}Mi"
  def memory(mem) when mem > @kb, do: "#{unit(mem, @kb)}Ki"
  def memory(mem), do: mem

  def cpu(nil), do: nil
  def cpu(cpu) when cpu > 1, do: cpu
  def cpu(cpu), do: "#{ceil(cpu * 1000, 10)}m"

  def maybe_quote(val) when is_binary(val), do: ~s("#{val}")
  def maybe_quote(val), do: val

  defp ceil(v, mult), do: ceil(v / mult) * mult
  defp round(v, mult), do: round(v / mult) * mult
  defp unit(v, unit), do: round(round(v / unit), 10)
end
