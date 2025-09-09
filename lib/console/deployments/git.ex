defmodule Console.Deployments.Git do
  use Console.Services.Base
  use Nebulex.Caching
  import Console.Deployments.Policies
  alias Console.PubSub
  alias Console.Deployments.{Settings, Services, Clusters}
  alias Console.Services.Users
  alias Console.Cached.ClusterNodes
  alias Console.Deployments.Pr.{Dispatcher, Validation}
  alias Console.Deployments.Pr.Governance.Provider, as: GovernanceProvider
  alias Console.Schema.{
    GitRepository,
    User,
    DeploymentSettings,
    ScmConnection,
    ScmWebhook,
    PrAutomation,
    PullRequest,
    DependencyManagementService,
    HelmRepository,
    Observer,
    Catalog,
    PrGovernance
  }

  require Logger

  @cache Console.conf(:cache_adapter)
  @local_cache Console.conf(:local_cache)
  @ttl Console.conf(:ttls)[:helm]

  @type repository_resp :: {:ok, GitRepository.t} | Console.error
  @type helm_resp :: {:ok, HelmRepository.t} | Console.error
  @type connection_resp :: {:ok, ScmConnection.t} | Console.error
  @type webhook_resp :: {:ok, ScmWebhook.t} | Console.error
  @type automation_resp :: {:ok, PrAutomation.t} | Console.error
  @type pull_request_resp :: {:ok, PullRequest.t} | Console.error
  @type observer_resp :: {:ok, Observer.t} | Console.error
  @type catalog_resp :: {:ok, Catalog.t} | Console.error
  @type governance_resp :: {:ok, PrGovernance.t} | Console.error

  @decorate cacheable(cache: @cache, key: {:git_repo, id}, opts: [ttl: @ttl])
  def cached!(id), do: Repo.get!(GitRepository, id)

  def get_repository(id), do: Repo.get(GitRepository, id)

  def get_repository!(id), do: Repo.get!(GitRepository, id)

  def get_helm_repository(url), do: Repo.get_by(HelmRepository, url: url)

  def get_by_url!(url), do: Repo.get_by!(GitRepository, url: url)

  def get_by_url(url), do: Repo.get_by(GitRepository, url: url)

  def get_scm_connection(id), do: Repo.get(ScmConnection, id)
  def get_scm_connection!(id), do: Repo.get!(ScmConnection, id)

  def get_repositories(ids) do
    GitRepository.for_ids(ids)
    |> Repo.all()
    |> Map.new(fn %GitRepository{id: id} = git -> {id, git} end)
  end

  def default_scm_connection() do
    ScmConnection.default()
    |> Repo.one()
  end

  def get_scm_connection_by_name(name), do: Repo.get_by(ScmConnection, name: name)

  @decorate cacheable(cache: @cache, key: {:scm_webhook, id}, opts: [ttl: @ttl])
  def get_scm_webhook_by_ext_id(id), do: Repo.get_by!(ScmWebhook, external_id: id)

  def get_scm_webhook(id), do: Repo.get(ScmWebhook, id)

  def get_scm_webhook!(id), do: Repo.get!(ScmWebhook, id)

  def get_pr_automation(id), do: Repo.get(PrAutomation, id)
  def get_pr_automation!(id), do: Repo.get!(PrAutomation, id)

  def get_observer_by_name(name), do: Repo.get_by(Observer, name: name)

  def get_observer_by_name!(name), do: Repo.get_by!(Observer, name: name)

  def get_observer!(id), do: Repo.get!(Observer, id)

  def get_catalog_by_name(name), do: Repo.get_by(Catalog, name: name)

  def get_catalog_by_name!(name), do: Repo.get_by!(Catalog, name: name)

  def get_catalog!(id), do: Repo.get!(Catalog, id)

  def get_pr_automation_by_name(name), do: Repo.get_by(PrAutomation, name: name)

  def get_governance_by_name!(name), do: Repo.get_by!(PrGovernance, name: name)

  def get_governance_by_name(name), do: Repo.get_by(PrGovernance, name: name)

  def get_governance!(id), do: Repo.get!(PrGovernance, id)

  def deploy_url(), do: Console.conf(:deploy_url) || "https://github.com/pluralsh/deployment-operator.git"

  def artifacts_url(), do: Console.conf(:artifacts_url) || "https://github.com/pluralsh/scaffolds.git"

  def git_auth_attrs(), do: Console.conf(:git_auth_attrs) || %{}

  def deploy_repo!() do
    case Settings.fetch_consistent() do
      %DeploymentSettings{deployer_repository: %GitRepository{} = repo} -> repo
      _ -> get_by_url!(deploy_url())
    end
  end

  def artifacts_repo!() do
    case Settings.fetch_consistent() do
      %DeploymentSettings{artifact_repository: %GitRepository{} = repo} -> repo
      _ -> get_by_url!(artifacts_url())
    end
  end

  @doc """
  Creates a new git repository and spawns a sync agent on the relevant node
  """
  @spec create_repository(map, User.t) :: repository_resp
  def create_repository(attrs, %User{} = user) do
    %GitRepository{}
    |> GitRepository.changeset(attrs)
    |> allow(user, :git)
    |> when_ok(:insert)
    |> notify(:create, user)
  end

  @doc """
  It will update a repository and send events downstream
  """
  @spec update_repository(map, binary, User.t) :: repository_resp
  def update_repository(attrs, id, %User{} = user) do
    get_repository!(id)
    |> GitRepository.changeset(attrs)
    |> allow(user, :git)
    |> when_ok(:update)
    |> notify(:update, user)
  end

  @doc """
  It will delete a repository if it's not currently in use
  """
  @spec delete_repository(binary, User.t) :: repository_resp
  def delete_repository(id, %User{} = user) do
    try do
      get_repository!(id)
      |> GitRepository.changeset()
      |> allow(user, :git)
      |> when_ok(&Repo.delete(&1, timeout: 60_000))
      |> notify(:delete, user)
    rescue
      # foreign key constraint violated
      e ->
        Logger.error "Could not delete git repository: #{Exception.format(:error, e, __STACKTRACE__)}}"
        {:error, "could not delete repository"}
    end
  end

  @doc """
  Creates another webhook (besides the default) for a given scm connection
  """
  @spec create_webhook_for_connection(binary, binary, User.t) :: webhook_resp
  def create_webhook_for_connection(owner, conn_id, %User{} = user) do
    conn = get_scm_connection!(conn_id)
    with {:ok, conn} <- allow(conn, user, :edit),
      do: create_webhook_for_connection(owner, conn)
  end

  @doc """
  Uses the creds in an scm connection to create a properly configured webhook for us to use
  """
  @spec create_webhook_for_connection(binary, ScmConnection.t) :: webhook_resp
  def create_webhook_for_connection(owner, %ScmConnection{} = conn) do
    start_transaction()
    |> add_operation(:hook, fn _ ->
      %ScmWebhook{type: conn.type}
      |> ScmWebhook.changeset(%{owner: owner})
      |> Repo.insert()
    end)
    |> add_operation(:remote, fn %{hook: hook} ->
      case Dispatcher.webhook(conn, hook) do
        :ok -> {:ok, conn}
        err -> err
      end
    end)
    |> execute(extract: :hook)
  end

  @doc """
  Creates a new webhook for your console instance
  """
  @spec create_webhook(map, User.t) :: webhook_resp
  def create_webhook(attrs, %User{} = user) do
    %ScmWebhook{}
    |> ScmWebhook.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:insert)
  end

  @doc """
  Creates an scm connection and attempts to register a webhook simultaneously for the connection
  """
  @spec create_scm_connection(map, User.t) :: connection_resp
  def create_scm_connection(attrs, %User{} = user) do
    start_transaction()
    |> add_operation(:conn, fn _ ->
      %ScmConnection{}
      |> ScmConnection.changeset(attrs)
      |> allow(user, :edit)
      |> when_ok(:insert)
    end)
    |> add_operation(:hook, fn %{conn: conn} ->
      case attrs do
        %{owner: owner} when is_binary(owner) -> create_webhook_for_connection(owner, conn)
        _ -> {:ok, conn} # don't attempt webhook creation here
      end
    end)
    |> execute(extract: :conn)
  end

  @doc """
  Updates the attributes of a scm connection
  """
  @spec update_scm_connection(map, binary, User.t) :: connection_resp
  def update_scm_connection(attrs, id, %User{} = user) do
    get_scm_connection!(id)
    |> ScmConnection.changeset(attrs)
    |> allow(user, :edit)
    |> when_ok(:update)
  end

  @doc """
  Deletes an scm connection
  """
  @spec delete_scm_connection(binary, User.t) :: connection_resp
  def delete_scm_connection(id, %User{} = user) do
    get_scm_connection!(id)
    |> allow(user, :edit)
    |> when_ok(:delete)
  end

  @spec upsert_scm_connection(map, User.t) :: connection_resp
  def upsert_scm_connection(%{name: name} = attrs, %User{} = user) do
    case get_scm_connection_by_name(name) do
      %ScmConnection{id: id} -> update_scm_connection(attrs, id, user)
      nil -> create_scm_connection(attrs, user)
    end
  end

  @doc """
  Responds to a github app installation and registers an scm connection in response
  """
  @spec register_github_app(binary, binary, User.t) :: connection_resp
  def register_github_app(name, installation_id, %User{} = user) do
    case {Console.conf(:github_app_id), Console.conf(:github_app_pem)} do
      {app_id, pem} when is_binary(app_id) and is_binary(pem) ->
        upsert_scm_connection(%{
          type: :github,
          name: name,
          token: nil,
          github: %{app_id: app_id, installation_id: installation_id, private_key: pem}
        }, user)
      _ -> {:error, "you need to configure the github app id and pem in your environment before using this api"}
    end
  end

  @doc """
  creates an scm webhook
  """
  @spec create_scm_webhook(map, User.t) :: webhook_resp
  def create_scm_webhook(attrs, %User{} = user) do
    %ScmWebhook{}
    |> ScmWebhook.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:insert)
  end

  @doc """
  updates an scm webhook
  """
  @spec update_scm_webhook(map, binary, User.t) :: webhook_resp
  def update_scm_webhook(attrs, id, %User{} = user) do
    get_scm_webhook!(id)
    |> ScmWebhook.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:update)
  end

  @doc """
  deletes a scm webhook
  """
  @spec delete_scm_webhook(binary, User.t) :: webhook_resp
  def delete_scm_webhook(id, %User{} = user) do
    get_scm_webhook!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
  end

  @doc """
  creates a new pr automation reference
  """
  @spec create_pr_automation(map, User.t) :: automation_resp
  def create_pr_automation(attrs, %User{} = user) do
    %PrAutomation{}
    |> PrAutomation.changeset(Settings.add_project_id(attrs))
    |> allow(user, :create)
    |> when_ok(:insert)
  end

  @doc """
  updates an existing pr automation
  """
  @spec update_pr_automation(map, binary, User.t) :: automation_resp
  def update_pr_automation(attrs, id, %User{} = user) do
    get_pr_automation!(id)
    |> Repo.preload([:write_bindings, :create_bindings])
    |> allow(user, :write)
    |> when_ok(&PrAutomation.changeset(&1, attrs))
    |> when_ok(&allow(&1, user, :write))
    |> when_ok(:update)
  end

  @doc """
  Deletes a PR automation record
  """
  @spec delete_pr_automation(binary, User.t) :: automation_resp
  def delete_pr_automation(id, %User{} = user) do
    get_pr_automation!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
  end

  @doc """
  Creates a pull request given a pr automation instance
  """
  @spec create_pull_request(map, binary, binary, User.t) :: pull_request_resp
  def create_pull_request(attrs \\ %{}, ctx, pra, branch, identifier \\ nil, user)

  def create_pull_request(attrs, ctx, id, branch, identifier, user) when is_binary(id) do
    pra = get_pr_automation!(id)
    create_pull_request(attrs, ctx, pra, branch, identifier, user)
  end

  def create_pull_request(attrs, ctx, %PrAutomation{} = pr, branch, identifier, %User{} = user) do
    pr = Repo.preload(pr, [:write_bindings, :create_bindings, :connection])
    {secrets, ctx} = Map.pop(ctx, :secrets)
    with :ok <- Validation.validate(pr, ctx),
         {:ok, pr} <- allow(pr, user, :create),
         {:ok, pr_attrs} <- Dispatcher.create(prep(pr, user, identifier), branch, ctx) do
      Logger.info "creating pr #{pr_attrs[:url]}"
      start_transaction()
      |> add_operation(:pr, fn _ ->
        %PullRequest{}
        |> PullRequest.changeset(
          Map.merge(pr_attrs, Map.take(pr, ~w(cluster_id service_id)a))
          |> Map.merge(attrs)
          |> Map.put(:governance_id, pr.governance_id)
          |> Map.put(:notifications_bindings, Enum.map(pr.write_bindings, &Map.take(&1, [:user_id, :group_id])))
        )
        |> Repo.insert()
      end)
      |> add_operation(:secrets, fn _ -> create_secrets(pr, user, secrets) end)
      |> execute(extract: :pr)
      |> notify(:create, user)
    end
  end

  defp create_secrets(
    %PrAutomation{secrets: %PrAutomation.Secrets{cluster: cluster} = conf},
    %{} = secrets,
    %User{} = user
  ) when is_binary(cluster) do
    cluster = Clusters.get_cluster_by_handle!(cluster)
    Kube.Utils.save_kubeconfig(Clusters.control_plane(cluster, user))
    Kube.Utils.upsert_secret(
      conf.namespace,
      conf.name,
      secrets
    )
  end
  defp create_secrets(_, _, _), do: {:ok, %{}}

  defp prep(pr, %User{} = user, identifier) when is_binary(identifier) do
    prep(pr, user, nil)
    |> Map.put(:identifier, identifier)
  end
  defp prep(pr, %User{} = user, nil), do: put_in(pr.connection.author, user)

  @doc """
  Create a pull request record if a user has permissions
  """
  @spec create_pull_request(map, User.t) :: pull_request_resp
  def create_pull_request(attrs, %User{} = user) do
    %PullRequest{}
    |> PullRequest.changeset(attrs)
    |> allow(user, :create)
    |> when_ok(:insert)
    |> notify(:create, user)
  end

  @spec create_pull_request(map) :: pull_request_resp
  def create_pull_request(attrs) do
    %PullRequest{}
    |> PullRequest.changeset(attrs)
    |> Repo.insert()
    |> notify(:create)
  end

  @doc """
  Updates attributes for a pr in response to a scm webhook invocation
  """
  @spec upsert_pull_request(map, binary) :: pull_request_resp
  def upsert_pull_request(attrs, url) do
    case {attrs, Repo.get_by(PullRequest, url: url)} do
      {attrs, %PullRequest{} = pr} ->
        PullRequest.changeset(pr, attrs)
        |> Repo.update()
        |> notify(:update)
      {%{stack_id: stack_id} = attrs, nil} when is_binary(stack_id) ->
        create_pr(attrs, url)
      {%{cluster_id: cluster_id} = attrs, nil} when is_binary(cluster_id) ->
        create_pr(attrs, url)
      {%{service_id: service_id} = attrs, nil} when is_binary(service_id) ->
        create_pr(attrs, url)
      {%{flow_id: flow_id} = attrs, nil} when is_binary(flow_id) ->
        create_pr(attrs, url)
      _ -> {:error, :not_found}
    end
  end

  @doc """
  Confirms a pull request with the governance controller then approves it directly
  """
  @spec confirm_pull_request(PullRequest.t) :: pull_request_resp
  def confirm_pull_request(%PullRequest{} = pr) do
    with %PullRequest{} = pr = Repo.preload(pr, [governance: :connection]),
         {:ok, _} <- GovernanceProvider.confirm(pr),
         {:ok, _} <- Dispatcher.approve(pr.governance.connection, pr, "Approved by Plural PR Governance") do
      PullRequest.changeset(pr, %{approved: true})
      |> Repo.update()
    end
  end

  defp create_pr(attrs, url) do
    %PullRequest{url: url}
    |> PullRequest.changeset(attrs)
    |> Repo.insert()
    |> notify(:create)
  end

  @doc """
  Deletes this reference to a pull request from the db
  """
  @spec delete_pr(binary, User.t) :: pull_request_resp
  def delete_pr(id, %User{} = user) do
    Repo.get(PullRequest, id)
    |> PullRequest.changeset()
    |> allow(user, :write)
    |> when_ok(:delete)
  end

  @doc """
  Updates this pr reference in the db
  """
  @spec update_pr(map, binary, User.t) :: pull_request_resp
  def update_pr(attrs, id, %User{} = user) do
    Repo.get(PullRequest, id)
    |> PullRequest.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:update)
  end

  @doc """
  Fetches all helm repos registered in this cluster so far
  """
  @spec list_helm_repositories() :: {:ok, [Kube.HelmRepository.t]} | Console.error
  def list_helm_repositories() do
    case Kube.Client.list_helm_repositories() do
      {:ok, %{items: items}} -> {:ok, items}
      _ -> {:ok, []}
    end
  end

  def cached_helm_repositories(), do: @local_cache.get(:helm_repositories)

  def warm_helm_cache() do
    list_helm_repositories()
    |> ClusterNodes.helm_repos()
  end

  @spec upsert_helm_repository(binary) :: helm_resp
  def upsert_helm_repository(url) do
    case Console.Repo.get_by(HelmRepository, url: url) do
      %HelmRepository{} = repo -> repo
      nil -> %HelmRepository{url: url}
    end
    |> HelmRepository.changeset()
    |> Console.Repo.insert_or_update()
  end

  @doc """
  Upserts a helm repository record, optionally recording auth information where needed.

  Requires an admin user, or user w/ git write perms
  """
  @spec upsert_helm_repository(map, binary, User.t) :: helm_resp
  def upsert_helm_repository(attrs, url, %User{} = user) do
    case Console.Repo.get_by(HelmRepository, url: url) do
      %HelmRepository{} = repo -> repo
      nil -> %HelmRepository{url: url}
    end
    |> allow(user, :git)
    |> when_ok(&HelmRepository.changeset(&1, attrs))
    |> when_ok(&Repo.insert_or_update/1)
  end

  @doc """
  Upserts a new catalog instance, requires at least project write permissions
  """
  @spec upsert_catalog(map, User.t) :: catalog_resp
  def upsert_catalog(%{name: name} = attrs, %User{} = user) do
    case get_catalog_by_name(name) do
      %Catalog{} = catalog -> Repo.preload(catalog, [:read_bindings, :write_bindings, :create_bindings])
      nil -> %Catalog{project_id: attrs[:project_id] || Settings.default_project!().id}
    end
    |> allow(user, :write)
    |> when_ok(&Catalog.changeset(&1, attrs))
    |> when_ok(&Repo.insert_or_update/1)
  end

  @doc """
  Deletes the given catalog, works if user has write permissions on the catalog on up
  """
  @spec delete_catalog(binary, User.t) :: catalog_resp
  def delete_catalog(id, %User{} = user) do
    get_catalog!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
  end

  @doc """
  modifies rbac settings for this stack
  """
  @spec catalog_rbac(map, binary, User.t) :: catalog_resp
  def catalog_rbac(attrs, cat_id, %User{} = user) do
    get_catalog!(cat_id)
    |> Repo.preload([:read_bindings, :write_bindings, :create_bindings])
    |> allow(user, :write)
    |> when_ok(&Catalog.rbac_changeset(&1, attrs))
    |> when_ok(:update)
  end

  @doc """
  Upserts a new observer which can poll external registries and perform configurable actions
  as a result.
  """
  @spec upsert_observer(map, User.t) :: observer_resp
  def upsert_observer(%{name: name} = attrs, %User{} = user) do
    case get_observer_by_name(name) do
      %Observer{} = o -> Repo.preload(o, [:errors])
      nil -> %Observer{project_id: attrs[:project_id] || Settings.default_project!().id}
    end
    |> allow(user, :write)
    |> when_ok(&Observer.changeset(&1, attrs))
    |> when_ok(&Repo.insert_or_update/1)
  end

  @doc """
  Forcibly retriggers an observer to run immediately
  """
  @spec kick_observer(binary, User.t) :: observer_resp
  def kick_observer(id, %User{} = user) do
    get_observer!(id)
    |> Ecto.Changeset.change(%{next_run_at: Timex.now()})
    |> allow(user, :write)
    |> when_ok(:update)
  end

  @doc """
  Deletes an observer record
  """
  @spec delete_observer(binary, User.t) :: observer_resp
  def delete_observer(id, %User{} = user) do
    get_observer!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
  end

  @doc """
  Resets the current value of the given observer
  """
  @spec reset_observer(map, binary, User.t) :: observer_resp
  def reset_observer(attrs, id, %User{} = user) do
    get_observer!(id)
    |> Observer.reset_changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:update)
  end

  @doc """
  Upserts a new governance controller
  """
  @spec upsert_governance(map, User.t) :: governance_resp
  def upsert_governance(%{name: name} = attrs, %User{} = user) do
    case get_governance_by_name(name) do
      %PrGovernance{} = governance -> governance
      nil -> %PrGovernance{name: name}
    end
    |> PrGovernance.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(&Repo.insert_or_update/1)
  end

  @doc """
  Deletes a governance controller
  """
  @spec delete_governance(binary, User.t) :: governance_resp
  def delete_governance(id, %User{} = user) do
    get_governance!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
  end

  @doc """
  Sets up a service to run the renovate cron given an scm connection and target repositories
  """
  @spec setup_renovate(binary, [binary], User.t) :: Services.service_resp
  def setup_renovate(args \\ %{}, id, repos, %User{} = user) do
    cluster = Clusters.local_cluster()
    start_transaction()
    |> add_operation(:scm, fn _ -> {:ok, get_scm_connection!(id)} end)
    |> add_operation(:console, fn _ -> {:ok, Users.get_bot!("console") } end)
    |> add_operation(:token, fn %{console: console} ->
      Users.create_access_token(%{scopes: [%{apis: ["createPullRequestPointer"]}]}, console)
    end)
    |> add_operation(:svc, fn %{token: token, scm: scm} ->
      Services.create_service(%{
        repository_id: artifacts_repo!().id,
        name: Map.get(args, :name, "plural-renovate"),
        namespace: Map.get(args, :namespace, "plural-renovate"),
        git: %{ref: "main", folder: "addons/plural-renovate"},
        helm: %{values: "# you can add your values here\n{}"},
        configuration: [
          %{name: "consoleToken", value: token.token},
          %{name: "consoleUrl", value: Console.url("/gql")},
          %{name: "repositories", value: Enum.join(repos, ",")},
          %{name: "renovateToken", value: scm.token},
          %{name: "platform", value: "#{scm.type}"},
        ] ++ hosted_url(scm),
      }, cluster.id, user)
    end)
    |> add_operation(:dep_mgmt, fn %{scm: scm, svc: svc} ->
      %DependencyManagementService{connection_id: scm.id, service_id: svc.id}
      |> DependencyManagementService.changeset()
      |> Repo.insert()
    end)
    |> execute(extract: :svc)
  end

  def reconfigure_renovate(%{repositories: repos}, svc_id, %User{} = user),
    do: Services.merge_service([%{name: "repositories", value: Enum.join(repos, ",")}], svc_id, user)

  defp hosted_url(%ScmConnection{base_url: url}) when is_binary(url),
    do: [%{name: "endpoint", value: url}]
  defp hosted_url(_), do: []

  def status(%GitRepository{} = repo, status) do
    GitRepository.status_changeset(repo, status)
    |> Console.Repo.update()
    |> notify(:update)
  end

  defp notify({:ok, %GitRepository{} = git}, :create, user),
    do: handle_notify(PubSub.GitRepositoryCreated, git, actor: user)
  defp notify({:ok, %GitRepository{} = git}, :update, user),
    do: handle_notify(PubSub.GitRepositoryUpdated, git, actor: user)
  defp notify({:ok, %GitRepository{} = git}, :delete, user),
    do: handle_notify(PubSub.GitRepositoryDeleted, git, actor: user)

  defp notify({:ok, %PullRequest{} = pr}, :create, user),
    do: handle_notify(PubSub.PullRequestCreated, pr, actor: user)
  defp notify(pass, _, _), do: pass

  defp notify({:ok, %GitRepository{} = git}, :update),
    do: handle_notify(PubSub.GitRepositoryUpdated, git)
  defp notify({:ok, %PullRequest{} = pr}, :create),
    do: handle_notify(PubSub.PullRequestCreated, pr)
  defp notify({:ok, %PullRequest{} = pr}, :update),
    do: handle_notify(PubSub.PullRequestUpdated, pr)
  defp notify(pass, _), do: pass
end
