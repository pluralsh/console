defmodule ConsoleWeb.Controllers.Base do
  def pagination(conn) do
    case conn.private.oaskit.query_params do
      %{page: p, per_page: pp} -> [limit: pp, offset: (p - 1) * pp]
      _ -> []
    end
  end
end
