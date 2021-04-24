defmodule ConsoleWeb.LogController do
  use ConsoleWeb, :controller
  import Console.GraphQl.Resolvers.Observability, only: [ts: 1]

  plug ConsoleWeb.Rbac, permission: :operate

  def download(conn, %{"repo" => repo, "q" => q, "end" => e}) do
    now   = Timex.now()
    start = Timex.shift(now, minutes: -String.to_integer(e))

    conn =
      conn
      |> put_resp_content_type("text/plain")
      |> put_resp_header("content-disposition","attachment; filename=\"#{repo}_logs.txt\"")
      |> send_chunked(200)

    Loki.Stream.stream(q, ts(start), ts(now))
    |> Enum.reduce_while(conn, fn %Loki.Value{value: line}, conn ->
      case chunk(conn, line) do
        {:ok, conn} -> {:cont, conn}
        {:error, :closed} -> {:halt, conn}
      end
    end)
  end
end
