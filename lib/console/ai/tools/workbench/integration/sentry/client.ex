defmodule Console.AI.Tools.Workbench.Integration.Sentry.Client do
  @moduledoc false

  @default_host "https://sentry.io"
  @api_version "/api/0"

  @spec api_base(String.t() | nil) :: String.t()
  def api_base(url), do: normalize_host(url) <> @api_version

  @spec get(String.t(), String.t() | nil, String.t(), map()) :: {:ok, term()} | {:error, term()}
  def get(token, host, path, params \\ %{}) when is_binary(path) and is_map(params) do
    Req.new(base_url: api_base(host), auth: {:bearer, token})
    |> Req.get(url: path, params: stringify_params(params))
    |> decode()
  end

  defp normalize_host(url) when url in [nil, ""], do: @default_host

  defp normalize_host(url) do
    url
    |> String.trim()
    |> String.trim_trailing("/")
    |> String.replace(~r"/mcp(/.*)?$", "")
    |> then(fn
      "https://mcp.sentry.dev" -> @default_host
      "http://mcp.sentry.dev" -> @default_host
      other -> other
    end)
  end

  defp stringify_params(params) do
    params
    |> Enum.reject(fn {_, v} -> is_nil(v) end)
    |> Enum.map(fn
      {k, v} when is_boolean(v) -> {param_key(k), if(v, do: "true", else: "false")}
      {k, v} when is_list(v) -> {param_key(k), Enum.join(v, ",")}
      {k, v} -> {param_key(k), v}
    end)
    |> Map.new()
  end

  defp param_key(k) when is_atom(k), do: Atom.to_string(k)
  defp param_key(k) when is_binary(k), do: k

  defp decode({:ok, %Req.Response{status: s, body: body}}) when s in 200..299, do: {:ok, body}

  defp decode({:ok, %Req.Response{status: s, body: body}}),
    do: {:error, {:sentry_api, s, body}}

  defp decode({:error, reason}), do: {:error, reason}
end
