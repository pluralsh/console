defmodule ConsoleWeb.Plugs.WorkbenchMCP do
  @moduledoc """
  Resolves the workbench addressed by the request path, enforces read access for the
  authenticated user, then hands off to the anubis streamable http transport.

  Mounted behind a static forward prefix, so `path_info` is the remainder of the path, ie
  `["<workbench-id>"]` for `/mcp/workbench/<workbench-id>`.
  """
  @behaviour Plug
  import Plug.Conn
  alias Anubis.Server.Transport.StreamableHTTP
  alias Console.AI.Workbench.MCP.Server
  alias Console.Deployments.{Policies, Workbenches}
  alias Console.Repo
  alias Console.Schema.{User, Workbench, WorkbenchTool}

  @impl Plug
  def init(opts) do
    Keyword.put_new(opts, :server, Server)
    |> StreamableHTTP.Plug.init()
  end

  @impl Plug
  def call(%Plug.Conn{path_info: [id]} = conn, opts) do
    conn = fetch_query_params(conn)

    with {:user, %User{} = user} <- {:user, Guardian.Plug.current_resource(conn)},
         {:bench, %Workbench{} = bench} <- {:bench, workbench(id)},
         {:filter, {:ok, filter}} <- {:filter, filter(conn.query_params)},
         {:allow, {:ok, %Workbench{} = bench}} <- {:allow, Policies.allow(bench, user, :read)} do
      conn
      |> assign(:mcp, %{
        user: user,
        workbench: Repo.preload(bench, [:agent_runtime]),
        filter: filter
      })
      |> StreamableHTTP.Plug.call(opts)
    else
      {:user, _} -> deny(conn, 401, "unauthenticated")
      {:bench, _} -> deny(conn, 404, "workbench not found")
      {:filter, _} -> deny(conn, 400, "unknown tool category in the categories filter")
      {:allow, _} -> deny(conn, 403, "you do not have read access to this workbench")
    end
  end
  def call(conn, _), do: deny(conn, 404, "workbench not found")

  defp workbench(id) do
    with {:ok, id} <- Ecto.UUID.cast(id),
      do: Workbenches.get_workbench(id)
  end

  defp filter(%{"tools" => tools}), do: {:ok, {:names, split(tools)}}
  defp filter(%{"categories" => categories}) do
    with {:ok, categories} <- cast_categories(split(categories)),
      do: {:ok, {:categories, categories}}
  end
  defp filter(_), do: {:ok, :all}

  defp cast_categories(values) do
    Enum.reduce_while(values, {:ok, []}, fn value, {:ok, acc} ->
      case Ecto.Type.cast(WorkbenchTool.Category, value) do
        {:ok, category} -> {:cont, {:ok, [category | acc]}}
        _ -> {:halt, :error}
      end
    end)
  end

  defp split(value), do: String.split(value, ",", trim: true)

  defp deny(conn, status, message) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(status, Jason.encode!(%{error: message}))
    |> halt()
  end
end
