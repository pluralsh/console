defmodule Mix.Tasks.Prom.Mocks do
  @moduledoc "Generates mock files for prometheus queries"
  @shortdoc @moduledoc
  use Mix.Task
  import System, only: [get_env: 1]
  import Console.Cost.Utils, only: [replace: 2]
  alias Console.Schema.DeploymentSettings.Connection
  alias Console.Cost.Extract

  # @preferred_cli_env :test

  require Logger

  @end_t Timex.now() |> DateTime.to_iso8601()
  @start_t Timex.now() |> Timex.shift(months: -1) |> DateTime.to_iso8601()
  @headers [{"content-type", "application/x-www-form-urlencoded"}]

  def run(_) do
    {:ok, _} = Application.ensure_all_started(:hackney)

    conn = %Connection{
      host: get_env("PROMETHEUS_HOST"),
      user: get_env("PROMETHEUS_USER"),
      password: get_env("PROMETHEUS_PWD")
    }

    Extract.queries()
    |> Enum.each(fn {name, query} ->
      case query_range(conn, replace(query, cluster: "plrl-dev")) do
        {:ok, result} ->
          path = Path.join("testdata", "#{name}.json")
          File.write!(path, result)
          Logger.info "wrote #{path}"
        err ->
          Logger.error "Failed to execute query #{name}, err: #{inspect(err)}"
      end
    end)
  end

  defp query_range(conn, query) do
    Path.join(conn.host, "/api/v1/query_range")
    |> HTTPoison.post({:form, [
      {"query", query},
      {"end", @end_t},
      {"start", @start_t},
      {"step", "1d"}
    ]}, headers(conn))
    |> case do
      {:ok, %HTTPoison.Response{body: body, status_code: 200}} -> {:ok, body}
      _ -> {:error, "prometheus error"}
    end
  end

  defp headers(%Connection{user: u, password: p}) when is_binary(u) and is_binary(p) do
    [{"Authorization", Plug.BasicAuth.encode_basic_auth(u, p)} | @headers]
  end
  defp headers(_), do: @headers
end
