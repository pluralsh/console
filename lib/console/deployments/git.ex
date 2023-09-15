defmodule Console.Deployments.Git do
  use Console.Services.Base
  alias Console.Schema.{GitRepository, User}

  @type repository_resp :: {:ok, GitRepository.t} | Console.error

  def get_repository(id), do: Console.Repo.get(GitRepository, id)

  @doc """
  Creates a new git repository and spawns a sync agent on the relevant node
  """
  @spec create_repository(map, User.t) :: repository_resp
  def create_repository(attrs, %User{}) do
    %GitRepository{}
    |> GitRepository.changeset(attrs)
    |> Console.Repo.insert()
  end
end
