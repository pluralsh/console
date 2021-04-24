defmodule ConsoleWeb.HealthController do
  use ConsoleWeb, :controller

  def health(conn, _params) do
    json(conn, %{ok: true})
  end
end
