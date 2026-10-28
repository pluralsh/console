defmodule ConsoleWeb.Plugs.CachedParsers do
  @moduledoc """
  Parses a request like the endpoint does, but keeps the exact body in `conn.assigns.raw_body`, eg for
  signature checks. Only works on routes `ConsoleWeb.Plugs.Parsers` skips, since a body can only be read
  once. Multipart bodies can't be replayed, so they're left unparsed.
  """
  alias ConsoleWeb.Plugs.Parsers

  def init(opts), do: opts

  def call(conn, opts) do
    {body, conn} = Parsers.read_body(conn)

    conn
    |> Plug.Conn.assign(:raw_body, body)
    |> Parsers.parse(Keyword.merge([parsers: [:urlencoded, :json], body_reader: {__MODULE__, :replay, []}], opts))
  end

  @doc false
  def replay(%Plug.Conn{assigns: %{raw_body: body}} = conn, _opts), do: {:ok, body, conn}
end
