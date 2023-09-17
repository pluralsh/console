defmodule Console.Deployments.Git do
  use Console.Services.Base
  alias Console.Deployments.Settings
  alias Console.Schema.{GitRepository, User, DeploymentSettings}

  @type repository_resp :: {:ok, GitRepository.t} | Console.error

  def get_repository(id), do: Console.Repo.get(GitRepository, id)

  def get_by_url!(url), do: Console.Repo.get_by!(GitRepository, url: url)

  def deploy_url(), do: "https://github.com/pluralsh/deploy-operator.git"

  def artifacts_url(), do: "https://github.com/pluralsh/plural-artifacts.git"

  def deploy_repo!() do
    case Settings.fetch() do
      %DeploymentSettings{deployer_repository: %GitRepository{} = repo} -> repo
      _ -> get_by_url!(deploy_url())
    end
  end

  def artifacts_repo!() do
    case Settings.fetch() do
      %DeploymentSettings{artifact_repository: %GitRepository{} = repo} -> repo
      _ -> get_by_url!(artifacts_url())
    end
  end

  @doc """
  Creates a new git repository and spawns a sync agent on the relevant node
  """
  @spec create_repository(map, User.t) :: repository_resp
  def create_repository(attrs, %User{}) do
    %GitRepository{}
    |> GitRepository.changeset(attrs)
    |> Console.Repo.insert()
  end

  def status(%GitRepository{} = repo, status) do
    GitRepository.status_changeset(repo, status)
    |> Console.Repo.update()
  end
end
