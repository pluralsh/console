defmodule Console.Deployments.Pr.Dispatcher do
  import Console.Deployments.Pr.Git
  import Console.Deployments.Pr.Utils
  alias Console.Repo
  alias Console.Deployments.Pr.Config
  alias Console.Commands.Plural
  alias Console.Deployments.Pr.Impl.{Github, Gitlab}
  alias Console.Schema.{PrAutomation, ScmConnection}

  @type pr_resp :: {:ok, binary} | Console.error

  @callback create(pr :: PrAutomation.t, branch :: binary, context :: map) :: pr_resp

  @doc """
  Fully creates a pr against the working dispatcher implementation
  """
  @spec create(PrAutomation.t, binary, map) :: pr_resp
  def create(%PrAutomation{} = pr, branch, ctx) do
    %{scm_connection: conn} = pr = Repo.preload(pr, [:scm_connection])
    impl = dispatcher(conn)
    with {:ok, conn} <- setup(conn, pr.identifier, branch),
         {:ok, f} <- Config.config(pr, branch, ctx),
         {:ok, _} <- Plural.template(f),
         {:ok, msg} <- render_solid(pr.message, ctx),
         {:ok, _} <- commit(conn, msg),
         {:ok, _} <- push(conn, branch),
      do: impl.create(pr, branch, ctx)
  end

  defp dispatcher(%ScmConnection{type: :github}), do: Github
  defp dispatcher(%ScmConnection{type: :gitlab}), do: Gitlab
end
