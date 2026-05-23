defmodule Console.AI.Tools.Workbench.Integration.Pagerduty.Client do
  @moduledoc false

  @api_base "https://api.pagerduty.com"
  @accept "application/vnd.pagerduty+json;version=2"

  @spec get(String.t(), String.t(), map()) :: {:ok, map()} | {:error, term()}
  def get(token, path, params \\ %{}) when is_binary(path) and is_map(params) do
    Req.new(
      base_url: @api_base,
      headers: %{
        "Accept" => @accept,
        "Content-Type" => "application/json",
        "Authorization" => "Token token=#{token}"
      }
    )
    |> Req.get(url: path, params: encode_params(params))
    |> decode()
  end

  defp encode_params(params) do
    params
    |> Enum.reject(fn {_, v} -> is_nil(v) end)
    |> Enum.flat_map(fn
      {k, v} when is_list(v) ->
        v
        |> Enum.reject(&is_nil/1)
        |> Enum.map(&{array_key(k), &1})

      {k, v} ->
        [{param_key(k), v}]
    end)
    |> Map.new()
  end

  defp array_key(k), do: "#{param_key(k)}[]"
  defp param_key(k) when is_atom(k), do: Atom.to_string(k)
  defp param_key(k) when is_binary(k), do: k

  defp decode({:ok, %Req.Response{status: s, body: body}}) when s in 200..299 and is_map(body),
    do: {:ok, body}

  defp decode({:ok, %Req.Response{status: s, body: body}}),
    do: {:error, {:pagerduty_api, s, body}}

  defp decode({:error, reason}), do: {:error, reason}
end
