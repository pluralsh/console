defmodule Console.AI.Tools.Workbench.Integration.Github.Response do
  @moduledoc false

  @spec json(Tentacat.response()) :: {:ok, term} | {:error, term}
  def json({status, body, _}) when status >= 200 and status < 300 do
    Jason.encode(body)
  end

  def json({status, body, _}),
    do: {:error, "GitHub API #{status}: #{inspect(body)}"}

  def json(other),
    do: {:error, inspect(other)}
end
