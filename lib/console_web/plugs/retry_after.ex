defmodule ConsoleWeb.Plugs.RetryAfter do
  @moduledoc """
  Ensures every 429 carries a Retry-After header, whether it came from a Hammer limiter, a controller
  or a db pool queue timeout rendered by the error view.  Must be plugged before any of those can respond.
  """
  import Plug.Conn

  # all of our rate limit windows are 1s
  @retry_after "1"

  def init(opts), do: opts

  def call(conn, _opts), do: register_before_send(conn, &add_header/1)

  defp add_header(%Plug.Conn{status: 429} = conn) do
    case get_resp_header(conn, "retry-after") do
      [] -> put_resp_header(conn, "retry-after", @retry_after)
      _ -> conn
    end
  end
  defp add_header(conn), do: conn
end
