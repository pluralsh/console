defmodule Console.AI.Provider.TokenExchange.Response do
  @spec decode_response(Req.Response.t()) :: {:ok, map()} | {:error, binary()}
  def decode_response(%Req.Response{body: body} = response) when is_binary(body) do
    case Req.Response.get_header(response, "content-type") do
      [content_type | _] -> decode(body, String.downcase(content_type))
      [] -> decode_untyped(body)
    end
  end

  def decode_response(%Req.Response{body: body}) when is_map(body), do: {:ok, body}
  def decode_response(_), do: {:error, "invalid token response"}

  defp decode(body, content_type) do
    cond do
      "json" in MIME.extensions(content_type) ->
        decode_json(body)

      String.starts_with?(content_type, "application/x-www-form-urlencoded") ->
        decode_form(body)

      true ->
        decode_untyped(body)
    end
  end

  defp decode_untyped(body) do
    case decode_json(body) do
      {:ok, decoded} -> {:ok, decoded}
      _ -> decode_form(body)
    end
  end

  defp decode_json(body) do
    case Jason.decode(body) do
      {:ok, decoded} when is_map(decoded) -> {:ok, decoded}
      _ -> {:error, "invalid JSON token response"}
    end
  end

  defp decode_form(body) do
    {:ok, URI.decode_query(body)}
  rescue
    _ -> {:error, "invalid form-encoded token response"}
  end
end
