defmodule Console.AI.Tools.Workbench.Integration.Teams.Client do
  @moduledoc false

  alias OAuth2.Client, as: OAuthClient

  @graph_v1 "https://graph.microsoft.com/v1.0"

  @spec get(OAuthClient.t(), String.t(), map(), keyword()) :: {:ok, map()} | {:error, term()}
  def get(oauth, path_or_url, params \\ %{}, opts \\ []) when is_map(params) do
    url = absolutize(path_or_url)
    req = base_req(oauth, url, opts)

    get_opts =
      if map_size(params) == 0, do: [], else: [params: params]

    req
    |> Req.get(get_opts)
    |> decode()
  end

  @spec post(OAuthClient.t(), String.t(), map()) :: {:ok, map()} | {:error, term()}
  def post(oauth, path, body) when is_map(body) do
    oauth
    |> base_req(absolutize(path), [])
    |> Req.post(json: body)
    |> decode()
  end

  @spec patch(OAuthClient.t(), String.t(), map()) :: {:ok, map()} | {:error, term()}
  def patch(oauth, path, body) when is_map(body) do
    oauth
    |> base_req(absolutize(path), [])
    |> Req.patch(json: body)
    |> decode()
  end

  defp base_req(oauth, url, opts) do
    headers =
      case Keyword.get(opts, :consistency_level, :default) do
        :eventual -> %{"ConsistencyLevel" => "eventual"}
        _ -> %{}
      end

    Req.new(url: url, auth: {:bearer, bearer(oauth)}, headers: headers)
  end

  defp absolutize("https://" <> _ = url), do: url
  defp absolutize("http://" <> _ = url), do: url
  defp absolutize("/" <> _ = path), do: @graph_v1 <> path
  defp absolutize(path), do: @graph_v1 <> "/" <> path

  defp bearer(%OAuthClient{token: %OAuth2.AccessToken{access_token: t}}) when is_binary(t), do: t

  defp decode({:ok, %Req.Response{status: 204}}), do: {:ok, %{}}

  defp decode({:ok, %Req.Response{status: s, body: body}}) when s in 200..299 and is_map(body),
    do: {:ok, body}

  defp decode({:ok, %Req.Response{status: s, body: body}}),
    do: {:error, {:microsoft_graph, s, body}}

  defp decode({:error, reason}), do: {:error, reason}
end
