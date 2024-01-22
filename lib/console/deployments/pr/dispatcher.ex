defmodule Console.Deployments.Pr.Dispatcher do
  import Console.Deployments.Pr.Git
  import Console.Deployments.Pr.Utils
  alias Console.Repo
  alias Console.Deployments.Pr.Config
  alias Console.Commands.Plural
  alias Console.Deployments.Pr.Impl.{Github, Gitlab}
  alias Console.Schema.{PrAutomation, ScmConnection}


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
    %PrAutomation{connection: conn} = pr = Repo.preload(pr, [:connection])
    impl = dispatcher(conn)
    with {:ok, conn} <- setup(%{conn | branch: pr.branch}, pr.identifier, branch),
         {:ok, f} <- Config.config(pr, branch, ctx),
         {:ok, _} <- Plural.template(f, conn.dir),
         {:ok, msg} <- render_solid(pr.message, ctx),
         {:ok, _} <- commit(conn, msg),
         {:ok, _} <- push(conn, branch),
      do: impl.create(%{pr | branch: conn.branch}, branch, ctx)
  end

  defp dispatcher(%ScmConnection{type: :github}), do: Github
  defp dispatcher(%ScmConnection{type: :gitlab}), do: Gitlab
end
