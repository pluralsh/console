defmodule Console.Deployments.Pr.Dispatcher do
  import Console.Deployments.Pr.Git
  import Console.Deployments.Pr.Utils
  alias Console.Repo
  alias Console.Deployments.{Pr.Config, Pr.File, Git.Discovery, Tar, Settings}
  alias Console.Commands.{Plural}
  alias Console.Deployments.Pr.Impl.{Github, Gitlab, BitBucket}
  alias Console.Schema.{PrAutomation, PullRequest, ScmConnection, ScmWebhook, GitRepository, DeploymentSettings}

  @type pr_attrs :: %{title: binary, body: binary, branch: binary}
  @type pr_resp :: {:ok, pr_attrs} | Console.error

  @doc """
  Create a pull request for the given SCM, and return the title + url of the pr if successful
  """
  @callback create(pr :: PrAutomation.t, branch :: binary, context :: map) :: pr_resp

  @doc """
  Creates a webhook using the credentials in this connection
  """
  @callback webhook(conn :: ScmConnection.t, hook :: ScmWebhook.t) :: :ok | Console.error

  @doc """
  Gets updates to perform in response to a pr webhook event
  """
  @callback pr(msg :: map) :: {:ok, binary, map} | :ignore

  @doc """
  Creates a review on a given pr
  """
  @callback review(conn :: ScmConnection.t, pr :: PullRequest.t, message :: binary) :: {:ok, binary} | Console.error

  @callback approve(conn :: ScmConnection.t, pr :: PullRequest.t, message :: binary) :: {:ok, binary} | Console.error

  @callback files(conn :: ScmConnection.t, url :: binary) :: {:ok, [File.t]} | Console.error

  @callback pr_info(url :: binary) :: {:ok, %{atom => binary}} | Console.error

  @doc """
  Fully creates a pr against the working dispatcher implementation
  """
  @spec create(PrAutomation.t, binary, map) :: pr_resp
  def create(%PrAutomation{} = pr, branch, ctx) when is_binary(branch) do
    %PrAutomation{connection: conn} = pr = Repo.preload(pr, [:connection, :repository])
    pr = put_in(pr.identifier, resolve_repo(pr.identifier))
    with {:ok, conn} <- setup(%{conn | branch: pr.branch}, pr.identifier, branch),
         {:ok, f} <- Config.config(pr, branch, ctx),
         {:ok, ext} <- external_git(pr),
         {:ok, _} <- Plural.template(f, conn.dir, ext),
         {:ok, msg} <- render_solid(pr.message, ctx),
         {:ok, _} <- commit(conn, msg),
      do: handle_create(pr, conn, branch, ctx)
  end
  def create(_, _, _), do: {:error, "no branch specified for this pr"}

  defp handle_create(%PrAutomation{patch: true} = pr, conn, branch, ctx) do
    with {:ok, title, body} <- description(pr, ctx),
         {:ok, patch} <- commit_patch(conn),
      do: {:ok, %{title: title, body: body, branch: branch, url: "<patch>", patch: patch}}
  end

  defp handle_create(%PrAutomation{} = pr, conn, branch, ctx) do
    impl = dispatcher(conn)
    with {:ok, _} <- push(conn, branch),
      do: impl.create(%{pr | branch: conn.branch}, branch, ctx)
  end

  def webhook(%ScmConnection{} = conn, %ScmWebhook{} = hook) do
    impl = dispatcher(conn)
    impl.webhook(conn, hook)
  end

  def pr(%ScmWebhook{} = hook, body) do
    impl = dispatcher(hook)
    impl.pr(body)
  end

  def review(%ScmConnection{} = conn, %PullRequest{} = pr, body) do
    impl = dispatcher(conn)
    impl.review(conn, pr, body)
  end

  def approve(%ScmConnection{} = conn, %PullRequest{} = pr, body) do
    impl = dispatcher(conn)
    impl.approve(conn, pr, body)
  end

  def files(%ScmConnection{} = conn, url) do
    impl = dispatcher(conn)
    impl.files(conn, url)
  end

  def pr_info(%ScmConnection{} = conn, url) do
    impl = dispatcher(conn)
    impl.pr_info(url)
  end

  defp external_git(%PrAutomation{repository: %GitRepository{} = git, creates: %{git: %{ref: _, folder: _} = ref}}) do
    with {:ok, dir} <- Briefly.create(directory: true),
         {:ok, f} <- Discovery.fetch(git, ref),
         {:ok, contents} <- Tar.tar_stream(f),
         :ok <- Console.dump_folder(dir, contents),
      do: {:ok, dir}
  end
  defp external_git(_), do: {:ok, nil}

  defp resolve_repo("mgmt") do
    case Settings.cached() do
      %DeploymentSettings{mgmt_repo: r} when is_binary(r) -> r
      _ -> "mgmt"
    end
  end
  defp resolve_repo(identifier), do: identifier

  def dispatcher(%{type: :github}), do: Github
  def dispatcher(%{type: :gitlab}), do: Gitlab
  def dispatcher(%{type: :bitbucket}), do: BitBucket
end
