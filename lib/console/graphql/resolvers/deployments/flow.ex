defmodule Console.GraphQl.Resolvers.Deployments.Flow do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.{Flows, Policies}
  alias Console.Schema.{
    Flow,
    Service,
    Pipeline,
    McpServer,
    PullRequest,
    McpServerAudit,
    Alert,
    PreviewEnvironmentTemplate,
    PreviewEnvironmentInstance,
    VulnerabilityReport
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

  def list_preview_environment_templates(flow, args, _) do
    PreviewEnvironmentTemplate.for_flow(flow.id)
    |> PreviewEnvironmentTemplate.ordered()
    |> paginate(args)
  end

  def list_preview_environment_instances(flow, args, _) do
    PreviewEnvironmentInstance.for_flow(flow.id)
    |> PreviewEnvironmentInstance.ordered()
    |> paginate(args)
  end

  def list_vulnerability_reports_for_flow(flow, args, _) do
    VulnerabilityReport.for_flow(flow.id)
    |> VulnerabilityReport.ordered()
    |> paginate(args)
  end

  def resolve_flow(%{id: id}, %{context: %{current_user: user}}),
    do: Flows.accessible(id, user)

  def resolve_preview_environment_template(%{id: id}, %{context: %{current_user: user}})
    when is_binary(id) do
    Flows.get_preview_environment_template(id)
    |> Policies.allow(user, :read)
  end
  def resolve_preview_environment_template(%{flow_id: id, name: name}, %{context: %{current_user: user}})
    when is_binary(id) and is_binary(name) do
    Flows.get_preview_environment_template_for_flow(id, name)
    |> Policies.allow(user, :read)
  end
  def resolve_preview_environment_template(_, _), do: {:error, "must specify either id or flowId and name"}

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

  def upsert_preview_environment_template(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Flows.upsert_preview_environment_template(attrs, user)

  def delete_preview_environment_template(%{id: id}, %{context: %{current_user: user}}),
    do: Flows.delete_preview_environment_template(id, user)
end
