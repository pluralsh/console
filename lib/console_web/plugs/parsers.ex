defmodule ConsoleWeb.Plugs.Parsers do
  @moduledoc """
  Plug.Parsers for the endpoint, except for requests under one of the `:skip` path prefixes, which are
  left unread. Their controllers either read the body themselves with `read_body/1`, or add
  `ConsoleWeb.Plugs.CachedParsers` when they need both the exact body and parsed params.
  """
  @default_length 100_000_000

  def init(opts), do: Keyword.pop(opts, :skip, [])

  def call(%Plug.Conn{path_info: path} = conn, {skip, opts}) do
    case Enum.any?(skip, &List.starts_with?(path, &1)) do
      true -> conn
      false -> parse(conn, opts)
    end
  end

  @doc "Runs Plug.Parsers with the endpoint's defaults, `opts` override them"
  def parse(conn, opts \\ []) do
    [
      parsers: [:urlencoded, :multipart, :json],
      pass: ["*/*"],
      json_decoder: Phoenix.json_library(),
      length: length()
    ]
    |> Keyword.merge(opts)
    |> Plug.Parsers.init()
    |> then(&Plug.Parsers.call(conn, &1))
  end

  @doc """
  Reads the whole body of a request whose parsing was skipped, with the same size limit the parsers apply.
  Query and path params are merged into `conn.params`.
  """
  @spec read_body(Plug.Conn.t) :: {binary, Plug.Conn.t}
  def read_body(conn) do
    case Plug.Conn.read_body(conn, length: length()) do
      {:ok, body, conn} -> {body, parse(conn, parsers: [])}
      {:more, _, _} -> raise Plug.Parsers.RequestTooLargeError
      {:error, :timeout} -> raise Plug.TimeoutError
      {:error, _} -> raise Plug.BadRequestError
    end
  end

  defp length(), do: Console.conf(:max_request_body_length) || @default_length
end
