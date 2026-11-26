defmodule ConsoleWeb.Plugs.DevboxToken do
  @moduledoc """
  Authenticates a devbox instance's console token (`Console.Devboxes.Credentials.console_token/1`) as the instance's
  owner, recording the instance in `conn.assigns.devbox_instance` so handlers can narrow what it reaches.  The `scope`
  option selects which token scope this mount accepts and defaults to `workbench_mcp`.  File routes pass
  `workbench_files`, so a token that can only reach the workbench MCP is rejected there.  Only mounted where those
  tokens are meant to work: they are injected on every request from the sandbox to the console host, and anyone who
  can open a terminal on the instance can make those requests.
  """
  @behaviour Plug
  import Plug.Conn
  alias Console.Devboxes.Credentials
  alias Console.Schema.{DevboxInstance, User}

  @impl Plug
  def init(opts), do: opts

  @impl Plug
  def call(conn, opts) do
    scope = Keyword.get(opts, :scope, "workbench_mcp")

    with ["Bearer " <> token | _] <- get_req_header(conn, "authorization"),
         token = String.trim(token),
         true <- Credentials.devbox_token?(token),
         {:ok, %DevboxInstance{user: %User{} = user} = inst} <- Credentials.verify(token, scope) do
      key = Guardian.Plug.Pipeline.fetch_key(conn, opts)
      conn
      |> Guardian.Plug.put_current_token(token, key: key)
      |> Guardian.Plug.put_current_resource(Console.Services.Rbac.preload(user), key: key)
      |> Guardian.Plug.put_current_claims(%{"sub" => "user:#{user.id}"}, key: key)
      |> assign(:devbox_instance, inst)
    else
      {:error, _} -> conn |> send_resp(401, "invalid devbox token") |> halt()
      _ -> conn
    end
  end
end
