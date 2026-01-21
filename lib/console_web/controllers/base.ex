defmodule ConsoleWeb.Controllers.Base do
  alias Phoenix.Controller

  def successful({:ok, result}, conn, schema),
    do: Controller.json(conn, schema.wire_format(result))
  def successful(pass, _, _), do: pass

  def paginate(query, conn, schema) do
    Console.Repo.paginate(query, pagination(conn))
    |> then(&Controller.json(conn, schema.wire_format(&1)))
  end

  def pagination(conn) do
    case conn.private.oaskit.query_params do
      %{page: p, per_page: pp} -> [limit: pp, offset: (p - 1) * pp]
      _ -> []
    end
  end
end
