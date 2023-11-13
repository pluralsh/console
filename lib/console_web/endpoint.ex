defmodule ConsoleWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :console
  use Absinthe.Phoenix.Endpoint

  socket "/socket", ConsoleWeb.UserSocket,
    websocket: [check_origin: false],
    longpoll: false

  socket "/ext/socket", ConsoleWeb.ExternalSocket,
    websocket: [check_origin: false],
    longpoll: false

  # Serve at "/" the static files from "priv/static" directory.
  #
  # You should set gzip to true if you are running phx.digest
  # when deploying your static files in production.
  plug Plug.Static,
    at: "/",
    from: :console

  # Code reloading can be explicitly enabled under the
  # :code_reloader configuration of your endpoint.
  if code_reloading? do
    socket "/phoenix/live_reload/socket", Phoenix.LiveReloader.Socket
    plug Phoenix.LiveReloader
    plug Phoenix.CodeReloader
  end

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug CORSPlug
  plug ConsoleWeb.Plugs.RemoteIp
  plug ConsoleWeb.Plugs.AuditContext

  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library(),
    body_reader: {ConsoleWeb.CacheBodyReader, :read_body, []}

  plug Plug.MethodOverride
  plug Plug.Head

  plug ConsoleWeb.Plugs.MetricsExporter

  # The session will be stored in the cookie and signed,
  # this means its contents can be read but not tampered with.
  # Set :encryption_salt if you would also like to encrypt it.
  plug Plug.Session,
    store: :cookie,
    key: "_watchman_key",
    signing_salt: "cyhBqo3d"

  plug ConsoleWeb.Router
end
