defmodule Console.Deployments.Observability.Utils do
  def post_process(queries), do: Enum.map(queries, fn {k, v} -> {k, to_string(v)} end)
end
