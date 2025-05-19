defmodule Console.Prom.Benchmark do
  require Logger

  def measure(fun, msg) do
    {time, res} = :timer.tc(fun)
    Logger.info("#{msg} took #{time}μs")
    res
  end
end
