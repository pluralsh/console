defmodule Console.Deployments.Git do
  use Console.Services.Base
  import Console.Deployments.Policies
  alias Console.PubSub
  alias Console.Deployments.Settings
  alias Console.Deployments.Pr.Dispatcher
  alias Console.Schema.{
    GitRepository,
    User,
    DeploymentSettings,
    ScmConnection,
    ScmWebhook,
    PrAutomation,
    PullRequest
  }

  @type repository_resp :: {:ok, GitRepository.t} | Console.error
  @type connection_resp :: {:ok, ScmConnection.t} | Console.error
  @type webhook_resp :: {:ok, ScmWebhook.t} | Console.error
  @type automation_resp :: {:ok, PrAutomation.t} | Console.error
  @type pull_request_resp :: {:ok, PullRequest.t} | Console.error

  def get_repository(id), do: Repo.get(GitRepository, id)

  def get_repository!(id), do: Repo.get!(GitRepository, id)

  def get_by_url!(url), do: Repo.get_by!(GitRepository, url: url)

  def get_by_url(url), do: Repo.get_by(GitRepository, url: url)

  def get_scm_connection(id), do: Repo.get(ScmConnection, id)
  def get_scm_connection!(id), do: Repo.get!(ScmConnection, id)

  def get_scm_connection_by_name(name), do: Repo.get_by(ScmConnection, name: name)

  def get_scm_webhook(id), do: Repo.get(ScmWebhook, id)
  def get_scm_webhook!(id), do: Repo.get!(ScmWebhook, id)

  def get_pr_automation(id), do: Repo.get(PrAutomation, id)
  def get_pr_automation!(id), do: Repo.get!(PrAutomation, id)

  def get_pr_automation_by_name(name), do: Repo.get_by(PrAutomation, name: name)

  def deploy_url(), do: "https://github.com/pluralsh/deployment-operator.git"

  def artifacts_url(), do: "https://github.com/pluralsh/scaffolds.git"

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
      |> allow(user, :git)
      |> when_ok(:delete)
      |> notify(:delete, user)
    rescue
      # foreign key constraint violated
      _ -> {:error, "could not delete repository"}
    end
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
      create_webhook_for_connection(attrs[:owner], conn)
    end)
    |> execute(extract: :conn)
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
      |> Repo.insert_or_update()
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

  @doc """
  creates an scm webhook
  """
  @spec create_scm_webhook(map, User.t) :: webhook_resp
  def create_scm_webhook(attrs, %User{} = user) do
    %ScmWebhook{}
    |> ScmWebhook.changeset(attrs)
    |> allow(user, :edit)
    |> when_ok(:insert)
  end

  @doc """
  updates an scm webhook
  """
  @spec update_scm_webhook(map, binary, User.t) :: webhook_resp
  def update_scm_webhook(attrs, id, %User{} = user) do
    get_scm_webhook!(id)
    |> ScmWebhook.changeset(attrs)
    |> allow(user, :edit)
    |> when_ok(:update)
  end

  @doc """
  deletes a scm webhook
  """
  @spec delete_scm_webhook(binary, User.t) :: webhook_resp
  def delete_scm_webhook(id, %User{} = user) do
    get_scm_webhook!(id)
    |> allow(user, :edit)
    |> when_ok(:delete)
  end

  @doc """
  creates a new pr automation reference
  """
  @spec create_pr_automation(map, User.t) :: automation_resp
  def create_pr_automation(attrs, %User{} = user) do
    %PrAutomation{}
    |> PrAutomation.changeset(attrs)
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
    |> PrAutomation.changeset(attrs)
    |> allow(user, :write)
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
  def create_pull_request(ctx, id, branch, %User{} = user) do
    pr = get_pr_automation!(id)
         |> Repo.preload([:write_bindings, :create_bindings, :connection])
    with {:ok, pr} <- allow(pr, user, :create),
         {:ok, title, url} <- Dispatcher.create(put_in(pr.connection.author, user), branch, ctx) do
      %PullRequest{}
      |> PullRequest.changeset(
        Map.merge(%{title: title, url: url}, Map.take(pr, ~w(cluster_id service_id)a))
        |> Map.put(:notifications_bindings, Enum.map(pr.write_bindings, &Map.take(&1, [:user_id, :group_id])))
      )
      |> Repo.insert()
    end
  end

  @doc """
  Create a pull request record if a user has permissions
  """
  @spec create_pull_request(map, User.t) :: pull_request_resp
  def create_pull_request(attrs, %User{} = user) do
    %PullRequest{}
    |> PullRequest.changeset(attrs)
    |> allow(user, :create)
    |> when_ok(:insert)
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
  defp notify(pass, _, _), do: pass

  defp notify({:ok, %GitRepository{} = git}, :update),
    do: handle_notify(PubSub.GitRepositoryUpdated, git)
  defp notify(pass, _), do: pass
end
