defmodule WatchmanWeb.Rbac do
  import Plug.Conn

  def init(opts), do: Map.new(opts)

  def call(%{params: %{"repo" => repo}} = conn, %{permission: perm}) do
    user = Guardian.Plug.current_resource(conn)
    case {user, Watchman.Services.Rbac.validate(user, repo, perm)} do
      {_, true} -> conn
      {%Watchman.Schema.User{roles: %{admin: true}}, _} -> conn
      _ -> send_resp(conn, 403, "Forbidden") |> halt()
    end
  end
end