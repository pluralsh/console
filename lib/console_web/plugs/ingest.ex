defmodule ConsoleWeb.Plugs.Ingest do
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _) do
    with {:ok, _, _} <- Console.vmetrics_creds(),
         {:ok, _, _} <- Console.es_creds() do
      conn
    else
      _ ->
        conn
        |> send_resp(401, "Unauthorized")
        |> halt()
    end
  end

  def prom_url() do
    with {:ok, vurl, vtenant} <- Console.vmetrics_creds() do
      "#{vurl}/insert/#{vtenant}/prometheus/api/v1/write"
    end
  end

  def prom_select_url() do
    with {:ok, vurl, vtenant} <- Console.vmetrics_creds() do
      "#{vurl}/select/#{vtenant}/prometheus"
    end
  end

  def elastic_url(path) do
    with {:ok, url, _pass} <- Console.es_creds() do
      Path.join(url, path)
    end
  end
end
