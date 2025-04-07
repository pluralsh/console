defmodule Console.Deployments.Flows do
  use Console.Services.Base
  alias Console.PubSub
  import Console.Deployments.Policies
  alias Console.Deployments.Settings
  alias Console.Schema.{Flow, User, McpServer, McpServerAssociation}

  @type flow_resp :: {:ok, Flow.t} | Console.error
  @type server_resp :: {:ok, McpServer.t} | Console.error

  @spec get!(binary) :: Flow.t
  def get!(id), do: Repo.get!(Flow, id)

  @spec get(binary) :: Flow.t | nil
  def get(id), do: Repo.get(Flow, id)

  @spec get_by_name!(binary) :: Flow.t
  def get_by_name!(name), do: Repo.get_by!(Flow, name: name)

  @spec get_by_name(binary) :: Flow.t | nil
  def get_by_name(name), do: Repo.get_by(Flow, name: name)

  @spec get_mcp_server!(binary) :: McpServer.t
  def get_mcp_server!(id), do: Repo.get!(McpServer, id)

  @spec get_mcp_server(binary) :: McpServer.t | nil
  def get_mcp_server(id), do: Repo.get(McpServer, id)

  @spec get_mcp_server_by_name!(binary) :: McpServer.t
  def get_mcp_server_by_name!(name), do: Repo.get_by!(McpServer, name: name)

  @spec get_mcp_server_by_name(binary) :: McpServer.t | nil
  def get_mcp_server_by_name(name), do: Repo.get_by(McpServer, name: name)

  @doc "fetches and determines if the user has access to the given flow"
  @spec accessible(binary, User.t) :: flow_resp
  def accessible(id, %User{} = user) do
    get!(id)
    |> allow(user, :read)
  end

  @doc "fetches and determines if the user has access to the given mcp server"
  @spec server_accessible(binary, User.t) :: flow_resp
  def server_accessible(id, %User{} = user) do
    get_mcp_server!(id)
    |> allow(user, :read)
  end

  @doc """
  modifies rbac settings for this flow
  """
  @spec rbac(map, binary, User.t) :: flow_resp
  def rbac(attrs, flow_id, %User{} = user) do
    get!(flow_id)
    |> Repo.preload([:write_bindings, :read_bindings])
    |> allow(user, :write)
    |> when_ok(&Flow.rbac_changeset(&1, attrs))
    |> when_ok(:update)
  end

  @doc """
  modifies rbac settings for this mcp server
  """
  @spec server_rbac(map, binary, User.t) :: server_resp
  def server_rbac(attrs, server_id, %User{} = user) do
    get_mcp_server!(server_id)
    |> Repo.preload([:write_bindings, :read_bindings])
    |> allow(user, :write)
    |> when_ok(&McpServer.rbac_changeset(&1, attrs))
    |> when_ok(:update)
  end

  @doc """
  Either creates a new flow or updates an existing one
  """
  @spec upsert_flow(map, User.t) :: flow_resp
  def upsert_flow(%{name: name} = attrs, %User{} = user) do
    case get_by_name(name) do
      %Flow{} = flow -> update_flow(attrs, flow, user)
      nil -> create_flow(attrs, user)
    end
  end

  @doc """
  Creates a new flow
  """
  @spec create_flow(map, User.t) :: flow_resp
  def create_flow(attrs, %User{} = user) do
    start_transaction()
    |> add_operation(:flow, fn _ ->
      %Flow{}
      |> Flow.changeset(Settings.add_project_id(attrs))
      |> allow(user, :create)
      |> when_ok(:insert)
    end)
    |> add_operation(:authz, fn %{flow: flow} -> post_validate(flow, user) end)
    |> execute(extract: :flow)
    |> notify(:create, user)
  end

  @doc "Updates an existing flow"
  @spec update_flow(map, Flow.t | binary, User.t) :: flow_resp
  def update_flow(attrs, %Flow{} = flow, %User{} = user) do
    start_transaction()
    |> add_operation(:allow, fn _ ->
      allow(flow, user, :write)
    end)
    |> add_operation(:update, fn %{allow: flow} ->
      Repo.preload(flow, [:server_associations])
      |> Flow.changeset(attrs)
      |> Repo.update()
    end)
    |> add_operation(:authz, fn %{update: flow} -> post_validate(flow, user) end)
    |> execute(extract: :update)
    |> notify(:update, user)
  end
  def update_flow(attrs, id, %User{} = user) when is_binary(id),
    do: update_flow(attrs, get!(id), user)

  defp post_validate(%Flow{} = flow, %User{} = user) do
    case Repo.preload(flow, [server_associations: [:server]]) do
      %Flow{server_associations: [_ | _] = assocs} ->
        Enum.reduce_while(assocs, {:ok, flow}, fn %McpServerAssociation{server: server}, acc ->
          case allow(server, user, :write) do
            {:ok, _} -> {:cont, acc}
            _ -> {:halt, {:error, "you cannot edit this flow without access to mcp server #{server.name}"}}
          end
        end)
      _ -> {:ok, flow}
    end
  end

  @doc """
  Deletes an existing flow, will throw if not found
  """
  @spec delete_flow(binary, User.t) :: flow_resp
  def delete_flow(id, %User{} = user) do
    get!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  @doc """
  Creates or updates a MCP server, respecting authz policies
  """
  @spec upsert_mcp_server(map, User.t) :: server_resp
  def upsert_mcp_server(%{name: name} = attrs, %User{} = user) do
    case get_mcp_server_by_name(name) do
      %McpServer{} = server -> update_mcp_server(attrs, server, user)
      nil -> create_mcp_server(attrs, user)
    end
  end

  @doc """
  Creates a new MCP server, with appropriate authz and project defaults
  """
  @spec create_mcp_server(map, User.t) :: server_resp
  def create_mcp_server(attrs, %User{} = user) do
    %McpServer{}
    |> McpServer.changeset(Settings.add_project_id(attrs))
    |> allow(user, :create)
    |> when_ok(:insert)
    |> notify(:create, user)
  end

  @doc """
  Updates an existing MCP server
  """
  @spec update_mcp_server(binary, McpServer.t | binary, User.t) :: server_resp
  def update_mcp_server(attrs, %McpServer{} = server, %User{} = user) do
    start_transaction()
    |> add_operation(:allow, fn _ -> allow(server, user, :write) end)
    |> add_operation(:update, fn %{allow: server} ->
      Repo.preload(server, [:read_bindings, :write_bindings])
      |> McpServer.changeset(attrs)
      |> Repo.update()
    end)
    |> execute(extract: :update)
    |> notify(:update, user)
  end
  def update_mcp_server(attrs, id, %User{} = user) when is_binary(id),
    do: update_mcp_server(attrs, get_mcp_server!(id), user)

  @doc """
  Deletes an existing flow, will throw if not found
  """
  @spec delete_mcp_server(binary, User.t) :: server_resp
  def delete_mcp_server(id, %User{} = user) do
    get_mcp_server!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  defp notify({:ok, %Flow{} = flow}, :create, user),
    do: handle_notify(PubSub.FlowCreated, flow, actor: user)
  defp notify({:ok, %Flow{} = flow}, :update, user),
    do: handle_notify(PubSub.FlowUpdated, flow, actor: user)
  defp notify({:ok, %Flow{} = flow}, :delete, user),
    do: handle_notify(PubSub.FlowDeleted, flow, actor: user)
  defp notify(pass, _, _), do: pass
end
