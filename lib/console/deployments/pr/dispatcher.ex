defmodule Console.Deployments.Pr.Dispatcher do
  import Console.Deployments.Pr.Git
  import Console.Deployments.Pr.Utils
  alias Console.Repo
  alias Console.Deployments.{Pr.Config, Git.Discovery, Tar}
  alias Console.Commands.Plural
  alias Console.Deployments.Pr.Impl.{Github, Gitlab}
  alias Console.Schema.{PrAutomation, ScmConnection, GitRepository}


  @type pr_resp :: {:ok, binary, binary} | Console.error

  @doc """
  Create a pull request for the given SCM, and return the title + url of the pr if successful
  """
  @callback create(pr :: PrAutomation.t, branch :: binary, context :: map) :: pr_resp

  @doc """
  Fully creates a pr against the working dispatcher implementation
  """
  @spec create(PrAutomation.t, binary, map) :: pr_resp
  def create(%PrAutomation{} = pr, branch, ctx) do
    %PrAutomation{connection: conn} = pr = Repo.preload(pr, [:connection, :repository])
    impl = dispatcher(conn)
    with {:ok, conn} <- setup(%{conn | branch: pr.branch}, pr.identifier, branch),
         {:ok, f} <- Config.config(pr, branch, ctx),
         {:ok, ext} <- external_git(pr),
         {:ok, _} <- Plural.template(f, conn.dir, ext),
         {:ok, msg} <- render_solid(pr.message, ctx),
         {:ok, _} <- commit(conn, msg),
         {:ok, _} <- push(conn, branch),
      do: impl.create(%{pr | branch: conn.branch}, branch, ctx)
  end

  defp external_git(%PrAutomation{repository: %GitRepository{} = git, creates: %{git: %{ref: _, folder: _} = ref}}) do
    with {:ok, dir} <- Briefly.create(directory: true),
         {:ok, f} <- Discovery.fetch(git, ref),
         {:ok, contents} <- Tar.tar_stream(f),
         :ok <- Console.dump_folder(dir, contents),
      do: {:ok, dir}
  end
  defp external_git(_), do: {:ok, nil}

  defp dispatcher(%ScmConnection{type: :github}), do: Github
  defp dispatcher(%ScmConnection{type: :gitlab}), do: Gitlab
end
