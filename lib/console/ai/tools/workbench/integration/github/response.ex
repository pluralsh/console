defmodule Console.AI.Tools.Workbench.Integration.Github.Response do
  @moduledoc false

  @spec json(Tentacat.response()) :: {:ok, term} | {:error, term}
  def json({status, body, _}) when status >= 200 and status < 300 do
    body
    |> normalize_tentacat_body()
    |> Jason.encode()
  end

  def json({status, body, _}),
    do: {:error, "GitHub API #{status}: #{inspect(body)}"}

  def json(other),
    do: {:error, inspect(other)}

  defp normalize_tentacat_body(body) when is_list(body) do
    {more, items} = Enum.reduce(body, {false, []}, fn
      {_, %{"items" => items} = res, _}, {more, acc} ->
        {more || Map.get(res, "incomplete_results", false), acc ++ items}
      %{} = item, {more, items} -> {more, [item | items]}
      _, {_, items} -> {false, items}
    end)

    %{
      "items" => items,
      "incomplete_results" => more
    }
  end
  defp normalize_tentacat_body(body), do: body
end
