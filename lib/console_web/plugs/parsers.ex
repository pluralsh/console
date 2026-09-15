defmodule ConsoleWeb.Plugs.Parsers do
  @default_length 100_000_000

  def init(opts) do
    Keyword.merge([
      parsers: [:urlencoded, :multipart, :json],
      pass: ["*/*"],
      json_decoder: Phoenix.json_library(),
      body_reader: {ConsoleWeb.CacheBodyReader, :read_body, []}
    ], opts)
  end

  def call(conn, opts) do
    length = Console.conf(:max_request_body_length) || @default_length

    Plug.Parsers.call(conn, Plug.Parsers.init(Keyword.put(opts, :length, length)))
  end
end
