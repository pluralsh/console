defmodule Console.Cost.Utils do
  alias Console.Schema.DeploymentSettings

  def replace(string, args) do
    Enum.reduce(args, string, fn {k, v}, str -> String.replace(str, "{#{k}}", v) end)
  end

  def to_int(nil), do: nil
  def to_int(val) when is_integer(val), do: val
  def to_int(val) when is_float(val), do: round(val)
  def to_int(val) when is_binary(val) do
    case Integer.parse(val) do
      {v, _} -> v
      _ -> 0
    end
  end

  def to_float(val) when is_binary(val) do
    case Float.parse(val) do
      {v, _} -> v
      _ -> 0.0
    end
  end

  def batch_insert(records, schema, opts \\ []) do
    {repo, opts} = Keyword.pop(opts, :repo, Console.LocalRepo)

    Console.throttle(records, count: 200, pause: 10)
    |> Stream.chunk_every(200)
    |> Enum.each(&repo.insert_all(schema, &1, opts))
  end

  def if_enabled(%DeploymentSettings{cost: %DeploymentSettings.Cost{enabled: true}} = settings, fun) when is_function(fun, 1),
    do: fun.(settings)
  def if_enabled(_, _), do: {:error, "cost management not enabled"}
end
