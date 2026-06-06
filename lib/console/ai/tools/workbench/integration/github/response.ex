defmodule Console.AI.Tools.Workbench.Integration.Github.Response do
  @moduledoc false

  alias Console.AI.Tools.Workbench.Integration.Http

  @spec json(Tentacat.response()) :: {:ok, term} | {:error, term}
  def json({:error, reason}),
    do: Http.error("GitHub", reason)

  def json({{status, body, resp}, next, _}) when status >= 200 and status < 300 do
    body
    |> add_pagination(next, resp)
    |> Jason.encode()
  end

  def json({{status, body, _}, _, _}),
    do: {:error, "GitHub API #{status}: #{inspect(body)}"}

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
    {more, items} =
      Enum.reduce(body, {false, []}, fn
        {_, %{"items" => items} = res, _}, {more, acc} ->
          {more || Map.get(res, "incomplete_results", false), acc ++ items}

        %{} = item, {more, items} ->
          {more, [item | items]}

        _, {_, items} ->
          {false, items}
      end)

    %{
      "items" => items,
      "incomplete_results" => more
    }
  end

  defp normalize_tentacat_body(body), do: body

  defp add_pagination(%{} = body, next, resp),
    do: Map.put(body, "pagination", pagination(next, resp))

  defp add_pagination(body, next, resp),
    do: %{
      "items" => body,
      "pagination" => pagination(next, resp)
    }

  defp pagination(next, resp) do
    %{
      "has_next_page" => is_binary(next),
      "next_page" => query_param(next, "page"),
      "per_page" => query_param(next, "per_page"),
      "next_url" => next,
      "link" => header(resp, "Link")
    }
  end

  defp query_param(url, key) when is_binary(url) do
    url
    |> URI.parse()
    |> Map.get(:query)
    |> case do
      nil -> nil
      query -> query |> URI.decode_query() |> Map.get(key)
    end
  end

  defp query_param(_, _), do: nil

  defp header(%HTTPoison.Response{headers: headers}, key) do
    Enum.find_value(headers, fn
      {^key, value} -> value
      _ -> nil
    end)
  end

  defp header(_, _), do: nil
end
