defmodule Console.Deployments.Git do
  use Console.Services.Base
  import Console.Deployments.Policies
  alias Console.PubSub
  alias Console.Deployments.Settings
  alias Console.Schema.{GitRepository, User, DeploymentSettings}

  @type repository_resp :: {:ok, GitRepository.t} | Console.error

  def get_repository(id), do: Console.Repo.get(GitRepository, id)

  def get_repository!(id), do: Console.Repo.get!(GitRepository, id)

  def get_by_url!(url), do: Console.Repo.get_by!(GitRepository, url: url)

  def deploy_url(), do: "https://github.com/pluralsh/deployment-operator.git"

  def artifacts_url(), do: "https://github.com/pluralsh/plural-artifacts.git"

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
