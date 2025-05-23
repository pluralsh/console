defmodule Console.Watchers.Plural do
  @socket_name Application.compile_env(:console, :socket)

  def worker() do
    {token, endpoint} = plural_config()
    socket_opts = [
      url: "wss://#{endpoint}/socket/websocket?token=#",
      params: %{token: token}
    ]

    {PhoenixClient.Socket, {socket_opts, [name: @socket_name, id: @socket_name]}}
  end

  def start_wss() do
    {token, endpoint} = plural_config()
    socket_opts = [
      uri: "wss://#{endpoint}/socket/websocket?token=#{token}",
    ]

    Console.Plural.Socket.start_link(socket_opts)
  end

  defp plural_config() do
    config = Console.Plural.Config.config_file()
    {config["token"], plural_endpoint(config)}
  end

  defp plural_endpoint(%{"endpoint" => e}) when byte_size(e) > 0, do: e
  defp plural_endpoint(_), do: "app.plural.sh"
end
