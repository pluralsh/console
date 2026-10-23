defmodule ConsoleWeb.Plugs.Ingest do
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _) do
    case configured?(Console.plural_o11y?()) do
      true -> conn
      false ->
        conn
        |> send_resp(401, "Unauthorized")
        |> halt()
    end
  end

  defp configured?(true), do: match?({:ok, _}, Console.telemetry_url(:metrics, :write))
  defp configured?(_) do
    with {:ok, _, _} <- Console.vmetrics_creds(),
         {:ok, _, _} <- Console.es_creds() do
      true
    else
      _ -> false
    end
  end

  def prom_url() do
    case Console.plural_o11y?() do
      true -> telemetry_url(:metrics, :write, "/api/v1/write")
      _ ->
        with {:ok, vurl, vtenant} <- Console.vmetrics_creds(),
          do: "#{vurl}/insert/#{vtenant}/prometheus/api/v1/write"
    end
  end

  def prom_select_url() do
    case Console.plural_o11y?() do
      true -> telemetry_url(:metrics, :read, "")
      _ ->
        with {:ok, vurl, vtenant} <- Console.vmetrics_creds(),
          do: "#{vurl}/select/#{vtenant}/prometheus"
    end
  end

  def elastic_url(path) do
    case Console.plural_o11y?() do
      true -> telemetry_url(:logs, :write, Path.join("/elasticsearch", path))
      _ ->
        with {:ok, url, _pass} <- Console.es_creds(),
          do: Path.join(url, path)
    end
  end

  def loki_push_url(), do: telemetry_url(:logs, :write, "/loki/api/v1/push")

  defp telemetry_url(product, mode, path) do
    with {:ok, url} <- Console.telemetry_url(product, mode),
      do: url <> path
  end
end
