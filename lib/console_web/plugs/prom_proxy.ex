defmodule ConsoleWeb.Plugs.PromProxy do
  alias Console.ReverseProxy.Client
  alias ConsoleWeb.Plugs.Ingest
  alias ReverseProxyPlug.HTTPClient.Adapters.Tesla

  def init(_opts) do
    ReverseProxyPlug.init(
      upstream: &Ingest.prom_select_url/0,
      client: Tesla,
      client_options: [tesla_client: Client.client()]
    )
  end

  def call(conn, opts) do
    prefix_path(conn)
    |> ReverseProxyPlug.call(opts)
  end

  defp prefix_path(%Plug.Conn{path_info: ["ext", "v1", "query", "prometheus" | path]} = conn) do
    %{conn | path_info: path}
  end
  defp prefix_path(conn), do: conn
end
