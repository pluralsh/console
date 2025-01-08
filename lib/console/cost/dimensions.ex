defmodule Console.Cost.Dimensions do
  @kb 1024
  @mb @kb * @kb

  def memory(mem) when mem > @mb, do: "#{unit(mem, @mb)}Mi"
  def memory(mem) when mem > @kb, do: "#{unit(mem, @kb)}Ki"
  def memory(mem), do: mem

  def cpu(cpu) when cpu > 1, do: cpu
  def cpu(cpu), do: "#{cpu * 1000}m"

  def maybe_quote(val) when is_binary(val), do: ~s("#{val}")
  def maybe_quote(val), do: val

  defp round(v, mult), do: round(v / mult) * mult
  defp unit(v, unit), do: round(round(v, unit), 10)
end
