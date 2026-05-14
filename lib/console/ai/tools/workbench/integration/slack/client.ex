defmodule Console.AI.Tools.Workbench.Integration.Slack.Client do
  @moduledoc false

  require Logger

  @slack_api_base "https://slack.com/api"

  @spec get(String.t(), String.t(), map() | keyword()) :: {:ok, map()} | {:error, term()}
  def get(method, token, params \\ %{}) do
    Req.new(base_url: @slack_api_base, auth: {:bearer, token})
    |> Req.get(url: method, params: params)
    |> slack_ok()
  end

  @spec post(String.t(), String.t(), map() | keyword()) :: {:ok, map()} | {:error, term()}
  def post(method, token, form \\ %{}) do
    Req.new(base_url: @slack_api_base, auth: {:bearer, token})
    |> Req.post(url: method, form: form)
    |> slack_ok()
  end

  defp slack_ok({:ok, %{body: %{"ok" => true} = body}}), do: {:ok, body}
  defp slack_ok(other), do: {:error, other}
end
