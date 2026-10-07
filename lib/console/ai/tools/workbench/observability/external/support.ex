defmodule Console.AI.Tools.Workbench.Observability.External.Support do
  @moduledoc false

  def page(resource, items, opts, pagination \\ [])
      when resource in [:dashboards, :monitors] do
    %{
      resource => items,
      limit: opts[:limit],
      next_cursor: pagination[:next_cursor],
      total: pagination[:total]
    }
  end

  def item(id, title, description, url, definition) do
    %{
      id: id,
      title: title,
      description: description,
      url: url,
      definition: definition
    }
  end

  def params(map) do
    map
    |> Enum.reject(fn {_, value} -> is_nil(value) or value == "" end)
    |> Map.new()
  end

  def next_offset_cursor(offset, count, total)
      when is_integer(total) and offset + count < total,
      do: Integer.to_string(offset + count)

  def next_offset_cursor(_, _, _), do: nil

  def next_page_cursor(page, count, limit, total \\ nil)

  def next_page_cursor(page, _count, limit, total)
      when is_integer(total) and is_integer(limit) and limit > 0 and
             (page + 1) * limit < total,
      do: Integer.to_string(page + 1)

  def next_page_cursor(page, count, limit, nil)
      when is_integer(count) and is_integer(limit) and count >= limit and limit > 0,
      do: Integer.to_string(page + 1)

  def next_page_cursor(_, _, _, _), do: nil

  def link_next_cursor(response) do
    with [link | _] <- Req.Response.get_header(response, "link"),
         [_, url] <- Regex.run(~r/<([^>]+)>;\s*rel="next"/, link),
         %URI{query: query} when is_binary(query) <- URI.parse(url) do
      URI.decode_query(query) |> Map.get("cursor")
    else
      _ -> nil
    end
  end

  def request(module, request, method, path, opts \\ []) do
    with {:ok, response} <- request_response(module, request, method, path, opts) do
      {:ok, response.body}
    end
  end

  def request_response(module, request, method, path, opts \\ []) do
    request
    |> Req.merge(Console.conf(module) || [])
    |> Req.request(
      [method: method, url: path]
      |> Keyword.merge(opts)
    )
    |> decode_response()
  end

  def encode_path(value), do: URI.encode(value, &URI.char_unreserved?/1)

  def unsupported_search(opts, provider, resource \\ "resource") do
    case String.trim(to_string(opts[:q] || "")) do
      "" -> :ok
      _ -> {:error, "#{provider} does not support server-side #{resource} search"}
    end
  end

  def offset_cursor(nil), do: {:ok, 0}
  def offset_cursor(""), do: {:ok, 0}

  def offset_cursor(cursor) when is_binary(cursor) do
    case Integer.parse(cursor) do
      {offset, ""} when offset >= 0 -> {:ok, offset}
      _ -> {:error, "invalid pagination cursor"}
    end
  end

  defp decode_response({:ok, %Req.Response{status: status} = response})
       when status in 200..299,
       do: {:ok, response}

  defp decode_response({:ok, %Req.Response{status: status, body: body}}),
    do: {:error, {:external_observability_api, status, body}}

  defp decode_response({:error, reason}), do: {:error, reason}
end
