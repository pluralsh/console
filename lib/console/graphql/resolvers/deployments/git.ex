defmodule Console.GraphQl.Resolvers.Deployments.Git do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.Git
  alias Console.Deployments.Helm.Repository
  alias Console.Schema.{
    GitRepository,
    PrAutomation,
    ScmConnection,
    PullRequest,
    ScmWebhook,
    HelmRepository,
    Observer,
    Catalog,
    DependencyManagementService,
    AgentSession
  }

  def resolve_scm_webhook(%{id: id}, _) when is_binary(id), do: {:ok, Git.get_scm_webhook(id)}
  def resolve_scm_webhook(%{external_id: ext_id}, _), do: {:ok, Git.get_scm_webhook_by_ext_id(ext_id)}

  def resolve_scm_connection(%{id: id}, _) when is_binary(id), do: {:ok, Git.get_scm_connection(id)}
  def resolve_scm_connection(%{name: name}, _), do: {:ok, Git.get_scm_connection_by_name(name)}

  def resolve_pr_automation(%{id: id}, _) when is_binary(id), do: {:ok, Git.get_pr_automation(id)}
  def resolve_pr_automation(%{name: name}, _), do: {:ok, Git.get_pr_automation_by_name(name)}

  def resolve_git(%{id: id}, _) when is_binary(id), do: {:ok, Git.get_repository(id)}
  def resolve_git(%{url: url}, _), do: {:ok, Git.get_by_url(url)}

  def resolve_helm_repository(%{url: url}, _), do: {:ok, Git.get_helm_repository(url)}

  def resolve_observer(%{id: id}, _) when is_binary(id), do: {:ok, Git.get_observer!(id)}
  def resolve_observer(%{name: name}, _), do: {:ok, Git.get_observer_by_name(name)}

  def resolve_catalog(%{id: id}, _) when is_binary(id), do: {:ok, Git.get_catalog!(id)}
  def resolve_catalog(%{name: name}, _), do: {:ok, Git.get_catalog_by_name(name)}

  def resolve_pr_governance(%{id: id}, _) when is_binary(id), do: {:ok, Git.get_governance!(id)}
  def resolve_pr_governance(%{name: name}, _), do: {:ok, Git.get_governance_by_name!(name)}

  def list_git_repositories(args, _) do
    GitRepository.ordered()
    |> paginate(args)
  end

  def list_helm_repositories(args, _) do
    HelmRepository.ordered()
    |> paginate(args)
  end

  def list_scm_connections(args, _) do
    ScmConnection.ordered()
    |> paginate(args)
  end

  def list_pr_automations(args, _) do
    PrAutomation.ordered()
    |> maybe_search(PrAutomation, args)
    |> pra_filters(args)
    |> paginate(args)
  end

  def list_pull_requests(args, _) do
    PullRequest.ordered()
    |> maybe_search(PullRequest, args)
    |> pr_filters(args)
    |> filter_proj(PullRequest, args)
    |> paginate(args)
  end

  def agent_prs(%AgentSession{agent_id: agent_id}, args, _) do
    PullRequest.ordered()
    |> PullRequest.for_agent(agent_id)
    |> pr_filters(args)
    |> maybe_search(PullRequest, args)
    |> paginate(args)
  end

  def list_scm_webhooks(args, _) do
    ScmWebhook.ordered()
    |> paginate(args)
  end

  def list_dependency_management_services(args, _) do
    DependencyManagementService.ordered()
    |> paginate(args)
  end

  def list_observers(args, _) do
    Observer.ordered()
    |> filter_proj(Observer, args)
    |> paginate(args)
  end

  def list_catalogs(args, _) do
    Catalog.ordered()
    |> filter_proj(Catalog, args)
    |> paginate(args)
  end

  def get_flux_helm_repository(%{name: name, namespace: ns}, _), do: Kube.Client.get_helm_repository(ns, name)

  def list_flux_helm_repositories(_, _), do: Git.list_helm_repositories()

  def helm_charts(helm, _, _), do: Repository.charts(helm)

  def helm_status(helm, _, _), do: Repository.status(helm)

  def git_refs(git), do: Git.Discovery.refs(git)

  def create_git_repository(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Git.create_repository(attrs, user)

  def update_git_repository(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Git.update_repository(attrs, id, user)

  def delete_git_repository(%{id: id}, %{context: %{current_user: user}}),
    do: Git.delete_repository(id, user)

  def create_scm_connection(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Git.create_scm_connection(attrs, user)

  def update_scm_connection(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Git.update_scm_connection(attrs, id, user)

  def delete_scm_connection(%{id: id}, %{context: %{current_user: user}}),
    do: Git.delete_scm_connection(id, user)

  def create_pr_automation(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Git.create_pr_automation(attrs, user)

  def update_pr_automation(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Git.update_pr_automation(attrs, id, user)

  def delete_pr_automation(%{id: id}, %{context: %{current_user: user}}),
    do: Git.delete_pr_automation(id, user)

  def create_pull_request(%{id: id, branch: branch, context: ctx} = args, %{context: %{current_user: user}}) do
    additional_context = Console.AI.Chat.pr_context(args[:thread_id])
    agent_id = Console.deep_get(additional_context, [:ai, :session, :agent_id])
    Git.create_pull_request(%{agent_id: agent_id}, Map.merge(ctx, additional_context), id, branch, args[:identifier], user)
  end

  def create_pr(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Git.create_pull_request(attrs, user)

  def update_pr(%{attributes: attrs, id: id}, %{context: %{current_user: user}}),
    do: Git.update_pr(attrs, id, user)

  def delete_pr(%{id: id}, %{context: %{current_user: user}}),
    do: Git.delete_pr(id, user)

  def create_webhook_for_connection(%{owner: owner, connection_id: conn_id}, %{context: %{current_user: user}}),
    do: Git.create_webhook_for_connection(owner, conn_id, user)

  def create_webhook(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Git.create_webhook(attrs, user)

  def delete_scm_webhook(%{id: id}, %{context: %{current_user: user}}),
    do: Git.delete_scm_webhook(id, user)

  def setup_renovate(%{connection_id: id, repos: repos} = args, %{context: %{current_user: user}}),
    do: Git.setup_renovate(args, id, repos, user)

  def reconfigure_renovate(%{repos: repos, service_id: svc_id}, %{context: %{current_user: user}}),
    do: Git.reconfigure_renovate(%{repositories: repos}, svc_id, user)

  def upsert_helm_repository(%{attributes: attrs, url: url}, %{context: %{current_user: user}}),
    do: Git.upsert_helm_repository(attrs, url, user)

  def upsert_observer(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Git.upsert_observer(attrs, user)

  def reset_observer(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Git.reset_observer(attrs, id, user)

  def kick_observer(%{id: id}, %{context: %{current_user: user}}),
    do: Git.kick_observer(id, user)

  def delete_observer(%{id: id}, %{context: %{current_user: user}}),
    do: Git.delete_observer(id, user)

  def upsert_catalog(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Git.upsert_catalog(attrs, user)

  def delete_catalog(%{id: id}, %{context: %{current_user: user}}),
    do: Git.delete_catalog(id, user)

  def register_github_app(%{name: name, installation_id: inst_id}, %{context: %{current_user: user}}),
    do: Git.register_github_app(name, inst_id, user)

  def upsert_pr_governance(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Git.upsert_governance(attrs, user)

  def delete_pr_governance(%{id: id}, %{context: %{current_user: user}}),
    do: Git.delete_governance(id, user)

  defp pr_filters(query, args) do
    Enum.reduce(args, query, fn
      {:cluster_id, cid}, q -> PullRequest.for_cluster(q, cid)
      {:service_id, sid}, q -> PullRequest.for_service(q, sid)
      {:open, true}, q -> PullRequest.open(q)
      _, q -> q
    end)
  end

  defp pra_filters(query, args) do
    Enum.reduce(args, query, fn
      {:catalog_id, cid}, q -> PrAutomation.for_catalog(q, cid)
      {:project_id, cid}, q -> PrAutomation.for_project(q, cid)
      {:role, role}, q  when not is_nil(role) -> PrAutomation.for_role(q, role)
      _, q -> q
    end)
  end

  defp filter_proj(query, mod, %{project_id: id}) when is_binary(id),
    do: mod.for_project(query, id)
  defp filter_proj(query, _, _), do: query
end
