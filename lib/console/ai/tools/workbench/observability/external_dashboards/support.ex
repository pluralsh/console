defmodule Console.AI.Tools.Workbench.Observability.ExternalDashboards.Support do
  @moduledoc false

  def page(dashboards, opts, pagination \\ []) do
    %{
      dashboards: dashboards,
      limit: opts[:limit],
      next_cursor: pagination[:next_cursor],
      total: pagination[:total]
    }
  end

  def dashboard(id, title, description, url, definition) do
    %{
      id: id,
      title: title,
      description: description,
      url: url,
      definition: definition
    }
  end

  def decode({:ok, %Req.Response{status: status, body: body}})
      when status in 200..299,
      do: {:ok, body}

  def decode({:ok, %Req.Response{status: status, body: body}}),
    do: {:error, {:external_dashboard_api, status, body}}

  def decode({:error, reason}), do: {:error, reason}

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

  def unsupported_search(opts, provider) do
    case String.trim(to_string(opts[:q] || "")) do
      "" -> :ok
      _ -> {:error, "#{provider} does not support server-side dashboard search"}
    end
  end

  def offset_cursor(nil), do: {:ok, 0}
  def offset_cursor(""), do: {:ok, 0}

  def offset_cursor(cursor) when is_binary(cursor) do
    case Integer.parse(cursor) do
      {offset, ""} when offset >= 0 -> {:ok, offset}
      _ -> {:error, "invalid dashboard pagination cursor"}
    end
  end

  defp decode_response({:ok, %Req.Response{status: status} = response})
       when status in 200..299,
       do: {:ok, response}

  defp decode_response({:ok, %Req.Response{status: status, body: body}}),
    do: {:error, {:external_dashboard_api, status, body}}

  defp decode_response({:error, reason}), do: {:error, reason}
end
