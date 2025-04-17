defmodule Console.GraphQl.Resolvers.Deployments.Flow do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.Flows
  alias Console.Schema.{
    Flow,
    Service,
    Pipeline,
    McpServer,
    PullRequest,
    McpServerAudit,
    Alert
  }

  def list_flows(args, %{context: %{current_user: user}}) do
    Flow.ordered()
    |> Flow.for_user(user)
    |> maybe_search(Flow, args)
    |> paginate(args)
  end

  def list_mcp_servers(args, %{context: %{current_user: user}}) do
    McpServer.ordered()
    |> McpServer.for_user(user)
    |> maybe_search(McpServer, args)
    |> paginate(args)
  end

  def services_for_flow(%{id: id}, args, _) do
    Service.for_flow(id)
    |> Service.ordered()
    |> paginate(args)
  end

  def pipelines_for_flow(%{id: id}, args, _) do
    Pipeline.for_flow(id)
    |> Pipeline.ordered()
    |> paginate(args)
  end

  def prs_for_flow(%{id: id}, args, _) do
    PullRequest.for_flow(id)
    |> PullRequest.ordered()
    |> paginate(args)
  end

  def alerts_for_flow(%{id: id}, args, _) do
    Alert.for_flow(id)
    |> Alert.ordered()
    |> paginate(args)
  end

  def list_audits_for_flow(flow, args, _) do
    McpServerAudit.for_server(flow.id)
    |> McpServerAudit.ordered()
    |> paginate(args)
  end

  def resolve_flow(%{id: id}, %{context: %{current_user: user}}),
    do: Flows.accessible(id, user)

  def upsert_flow(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Flows.upsert_flow(attrs, user)

  def delete_flow(%{id: id}, %{context: %{current_user: user}}),
    do: Flows.delete_flow(id, user)

  def resolve_mcp_server(%{id: id}, %{context: %{current_user: user}}),
    do: Flows.server_accessible(id, user)

  def upsert_mcp_server(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Flows.upsert_mcp_server(attrs, user)

  def delete_mcp_server(%{id: id}, %{context: %{current_user: user}}),
    do: Flows.delete_mcp_server(id, user)
end
