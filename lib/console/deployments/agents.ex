defmodule Console.Deployments.Agents do
  use Console.Services.Base
  import Console.Deployments.Policies
  import Console.Deployments.Pr.Git, only: [backfill_token: 1, to_http: 2]
  alias Console.Services.Users
  alias Console.Deployments.{Clusters, Pr.Dispatcher, Git}
  alias Console.AI.Tool
  alias Console.PubSub
  alias Kazan.Apis.Core.V1, as: CoreV1
  alias Console.Schema.{
    AgentRuntime,
    AgentRun,
    AgentPromptHistory,
    Cluster,
    User,
    Group,
    ScmConnection,
    PullRequest,
    AgentMessage,
    AgentRunRepository
  }
  require EEx

  @type error :: Console.error
  @type agent_run_resp :: {:ok, AgentRun.t} | error
  @type agent_runtime_resp :: {:ok, AgentRuntime.t} | error
  @type agent_msg_resp :: {:ok, AgentMessage.t} | error
  @type history_resp :: {:ok, AgentPromptHistory.t} | error

  def default_runtime(), do: Repo.get_by(AgentRuntime, default: true)

  def get_agent_runtime!(id), do: Repo.get!(AgentRuntime, id)

  def get_agent_runtime(cluster_id, name),
    do: Repo.get_by(AgentRuntime, cluster_id: cluster_id, name: name)

  def get_agent_runtime!(cluster_id, name),
    do: Repo.get_by!(AgentRuntime, cluster_id: cluster_id, name: name)

  def get_agent_run!(id), do: Repo.get!(AgentRun, id)

  @doc """
  Finds an agent runtime by name and cluster id (with the latter being optional)
  """
  @spec find_runtime(binary, binary) :: agent_runtime_resp
  def find_runtime(runtime, cid) when is_binary(runtime) and is_binary(cid) do
    case get_agent_runtime(cid, runtime) do
      %AgentRuntime{} = runtime -> {:ok, runtime}
      nil -> {:error, "could not find agent runtime #{runtime}"}
    end
  end

  def find_runtime(runtime, _) when is_binary(runtime) do
    AgentRuntime.for_name(runtime)
    |> AgentRuntime.limit(1)
    |> Repo.one()
    |> case do
      %AgentRuntime{} = runtime -> {:ok, runtime}
      nil -> {:error, "could not find agent runtime #{runtime}"}
    end
  end

  def find_runtime(_, _), do: {:error, "must at least specify runtime to generate an agent run"}

  @doc """
  Checks if an agent runtime exists for a cluster
  """
  @spec has_runtime?(Cluster.t) :: boolean
  def has_runtime?(%Cluster{id: cluster_id}) do
    AgentRuntime.for_cluster(cluster_id)
    |> Repo.exists?()
  end

  @doc """
  Upserts an agent runtime, can only be performed by deployment operators
  """
  @spec upsert_agent_runtime(map, Cluster.t) :: agent_runtime_resp
  def upsert_agent_runtime(%{name: name} = attrs, %Cluster{id: cluster_id}) do
    runtime = get_agent_runtime(cluster_id, name) |> Repo.preload([:create_bindings])
    case runtime do
      %AgentRuntime{} = runtime -> runtime
      nil -> %AgentRuntime{cluster_id: cluster_id}
    end
    |> AgentRuntime.changeset(stabilize(attrs, runtime || %AgentRuntime{create_bindings: []}))
    |> Repo.insert_or_update()
  end
  def upsert_agent_runtime(_, _), do: {:error, "name is required"}

  defp stabilize(%{create_bindings: [_ | _] = bindings} = attrs, %AgentRuntime{create_bindings: old_bindings}) do
    by_name = Map.new(old_bindings || [], & {&1.group_id || &1.user_id, &1.id})
    emails  = Enum.map(bindings, & &1[:user_email]) |> Enum.filter(& &1)
    groups  = Enum.map(bindings, & &1[:group_name]) |> Enum.filter(& &1)
    users_groups = Users.user_by_emails(emails)
                   |> Map.new(& {&1.email, &1})
    users_groups = Users.group_by_names(groups)
                   |> Enum.map(& {&1.name, &1})
                   |> Enum.into(users_groups)

    Enum.map(bindings, fn binding ->
      case Map.get(users_groups, binding[:user_email] || binding[:group_name]) do
        %User{id: id} -> %{user_id: id, id: by_name[id]}
        %Group{id: id} -> %{group_id: id, id: by_name[id]}
        _ -> nil
      end
    end)
    |> Enum.filter(& &1)
    |> update_map(:create_bindings, attrs)
  end
  defp stabilize(attrs, _), do: attrs

  @doc """
  Deletes an agent runtime, can only be performed by deployment operators
  """
  @spec delete_agent_runtime(binary, Cluster.t) :: agent_runtime_resp
  def delete_agent_runtime(id, %Cluster{id: cluster_id}) do
    case get_agent_runtime!(id) do
      %AgentRuntime{cluster_id: ^cluster_id} = runtime -> Repo.delete(runtime)
      _ -> {:error, "clusters can only delete their own agent runtimes"}
    end
  end

  @doc """
  Creates an agent run, initiated by an ordinary user with create bindings against the runtime
  """
  @spec create_agent_run(map, binary, User.t) :: agent_run_resp
  def create_agent_run(attrs, runtime_id, %User{id: user_id} = user) do
    start_transaction()
    |> add_operation(:runtime, fn _ ->
      get_agent_runtime!(runtime_id)
      |> Repo.preload([:create_bindings])
      |> allow(user, :create)
    end)
    |> add_operation(:run, fn _ ->
      %AgentRun{runtime_id: runtime_id, user_id: user_id}
      |> AgentRun.changeset(Map.put(attrs, :status, :pending))
      |> Repo.insert()
    end)
    |> add_operation(:repo, fn %{run: %AgentRun{} = run, runtime: runtime} ->
      case AgentRuntime.allowed_repository?(runtime, repository_url(run)) do
        true -> {:ok, run}
        false -> {:error, "repository is not allowed for this runtime, allowed repositories: #{inspect(runtime.allowed_repositories || [])}"}
      end
    end)
    |> execute(extract: :run)
    |> notify(:create)
  end

  @doc """
  Shares or unshares an agent run, can only be performed by the user who initiated it
  """
  @spec share_agent_run(binary, boolean, User.t) :: agent_run_resp
  def share_agent_run(run_id, shared, %User{} = user) when is_boolean(shared) do
    get_agent_run!(run_id)
    |> AgentRun.changeset(%{shared: shared})
    |> allow(user, :share)
    |> when_ok(:update)
  end

  @doc """
  Updates an agent run, can only be performed by deployment operators
  """
  @spec update_agent_run(map, binary, Cluster.t) :: agent_run_resp
  def update_agent_run(attrs, run_id, %Cluster{id: cluster_id}) do
    start_transaction()
    |> add_operation(:run, fn _ ->
      get_agent_run!(run_id)
      |> Repo.preload([:runtime, :messages])
      |> case do
        %AgentRun{runtime: %AgentRuntime{cluster_id: ^cluster_id}} = run ->
          {:ok, run}
        _ ->
          {:error, "clusters can only update their own agent runs"}
      end
    end)
    |> add_operation(:update, fn %{run: run} ->
      AgentRun.changeset(run, attrs)
      |> Repo.update()
    end)
    |> execute(extract: :update)
    |> notify(:update)
  end

  @spec create_agent_message(map, binary, Cluster.t) :: agent_msg_resp
  def create_agent_message(attrs, run_id, %Cluster{id: cluster_id}) do
    start_transaction()
    |> add_operation(:run, fn _ ->
      get_agent_run!(run_id)
      |> Repo.preload([:runtime])
      |> case do
        %AgentRun{runtime: %AgentRuntime{cluster_id: ^cluster_id}} = run ->
          {:ok, run}
        _ ->
          {:error, "clusters can only update their own agent runs"}
      end
    end)
    |> add_operation(:create, fn %{run: run} ->
      %AgentMessage{agent_run_id: run.id}
      |> AgentMessage.changeset(attrs)
      |> Repo.insert()
    end)
    |> execute(extract: :create)
    |> notify(:create)
  end

  @doc """
  Cancels an agent run, can only be performed by the user who initiated it
  """
  @spec cancel_agent_run(binary, User.t) :: agent_run_resp
  def cancel_agent_run(run_id, %User{id: user_id}) do
    start_transaction()
    |> add_operation(:run, fn _ ->
      case get_agent_run!(run_id) do
        %AgentRun{user_id: ^user_id} = run ->
          {:ok, run}
        _ -> {:error, "users can only cancel their own agent runs"}
      end
    end)
    |> add_operation(:update, fn %{run: run} ->
      AgentRun.changeset(run, %{status: :cancelled})
      |> Repo.update()
    end)
    |> execute(extract: :update)
    |> notify(:update)
  end

  @doc """
  Creates a new prompt for this agent run
  """
  @spec create_prompt(binary, binary) :: history_resp
  def create_prompt(prompt, run_id) do
    %AgentPromptHistory{}
    |> AgentPromptHistory.changeset(%{prompt: prompt, agent_run_id: run_id})
    |> Repo.insert()
  end

  @doc """
  Creates a pull request for an agent run, can only be performed by the user who initiated it
  """
  @spec agent_pull_request(map, binary, User.t) :: Git.pr_resp
  def agent_pull_request(%{title: t, body: b, base: ba, head: he} = attrs, run_id, %User{} = user) do
    run = get_agent_run!(run_id) |> Repo.preload([:runtime])
    shas = Map.new(attrs[:commit_shas] || [], & {&1[:branch], &1[:sha]})
    with {:ok, run} <- allow(run, user, :creds),
         %ScmConnection{} = conn <- Tool.scm_connection(),
         {:ok, conn} <- backfill_token(conn),
         conn = %{conn | commit_shas: shas},
         {:ok, pr_info} <- Dispatcher.pr(conn, t, b, repository_url(run), ba, he) do
      %PullRequest{fresh: true}
      |> PullRequest.changeset(
        Map.merge(pr_info, Map.take(run, ~w(flow_id session_id)a))
        |> Map.put(:agent_run_id, run.id)
      )
      |> Repo.insert()
      |> notify(:create)
    else
      nil -> {:error, "no scm connection found"}
      err -> err
    end
  end

  @doc """
  Updates the todos for an agent run, can only be performed by the user who initiated it
  """
  @spec update_todos([map], binary, User.t) :: agent_run_resp
  def update_todos(todos, run_id, %User{} = user) do
    start_transaction()
    |> add_operation(:run, fn _ ->
      get_agent_run!(run_id)
      |> allow(user, :update)
    end)
    |> add_operation(:update, fn %{run: run} ->
      AgentRun.changeset(run, %{todos: todos})
      |> Repo.update()
    end)
    |> execute(extract: :update)
    |> notify(:update)
  end

  @doc """
  Updates the analysis for an agent run, can only be performed by the user who initiated it
  """
  @spec update_analysis(map, binary, User.t) :: agent_run_resp
  def update_analysis(analysis, run_id, %User{} = user) do
    start_transaction()
    |> add_operation(:run, fn _ ->
      get_agent_run!(run_id)
      |> allow(user, :update)
    end)
    |> add_operation(:update, fn %{run: run} ->
      AgentRun.changeset(run, %{analysis: analysis})
      |> Repo.update()
    end)
    |> execute(extract: :update)
    |> notify(:update)
  end

  @doc """
  It will record the repository for an agent run if it was successful
  """
  @spec record_repository(AgentRun.t) :: {:ok, AgentRunRepository.t} | error
  def record_repository(%AgentRun{repository: repo, status: :successful}) do
    case Repo.get_by(AgentRunRepository, url: repo) do
      %AgentRunRepository{} = repo -> repo
      _ -> %AgentRunRepository{url: repo}
    end
    |> AgentRunRepository.changeset(%{last_used_at: Timex.now(), url: repo})
    |> Repo.insert_or_update()
  end
  def record_repository(_), do: {:error, "cannot record repository for non-successful agent runs"}

  @doc """
  Fetches the k8s pod resource from the agent run configured cluster via KAS
  """
  @spec run_pod(AgentRun.t) :: {:ok, CoreV1.Pod.t} | error
  def run_pod(%AgentRun{pod_reference: %{namespace: ns, name: name}} = run)
      when is_binary(ns) and is_binary(name) do
    %{runtime: %{cluster: cluster}} = Repo.preload(run, [runtime: :cluster])
    Clusters.control_plane(cluster)
    |> Kube.Utils.save_kubeconfig()

    CoreV1.read_namespaced_pod!(ns, name)
    |> Kube.Utils.run()
  end
  def run_pod(_), do: {:ok, nil}

  def plural_creds(%AgentRun{} = run, actor) do
    run = Repo.preload(run, [:user])
    with {:ok, %AgentRun{user: %User{} = user}} <- allow(run, actor, :creds),
         {:ok, token, _} <- Console.Guardian.encode_and_sign(user, %{}, ttl: {4, :hour}),
      do: {:ok, %{token: token, url: Console.graphql_endpoint()}}
  end

  def scm_creds(%AgentRun{} = run, actor) do
    with {:ok, _} <- allow(run, actor, :creds),
         %ScmConnection{username: username} = conn <- Tool.scm_connection(),
         {:ok, conn} <- backfill_token(conn) do
      {:ok, %{username: username || "apikey", token: conn.token}}
    else
      nil -> {:error, "no scm connection found"}
      err -> err
    end
  end

  @doc """
  Converts the repository URL to a http URL
  """
  @spec repository_url(AgentRun.t) :: binary
  def repository_url(%AgentRun{repository: repo_url}) do
    case Tool.scm_connection() do
      %ScmConnection{} = conn -> to_http(conn, repo_url)
      _ -> repo_url
    end
  end

  @doc """
  Creates a review for a given pull request explaining the ai's thought process for a given agent run pr.
  """
  @spec pr_review(PullRequest.t) :: {:ok, binary} | Console.error
  def pr_review(%PullRequest{agent_run_id: run_id} = pr) when is_binary(run_id) do
    run = get_agent_run!(run_id) |> Repo.preload([:runtime])
    with %ScmConnection{} = conn <- Tool.scm_connection(),
         {:ok, conn} <- backfill_token(conn) do
      Dispatcher.review(conn, pr, pr_blob(pr: pr, run: run))
    end
  end
  def pr_review(_), do: {:error, "no agent run id found"}

  @doc """
  Sanitizes a prompt by truncating it to 500 characters and returning the first line
  """
  @spec sanitize_prompt(binary) :: binary
  def sanitize_prompt(prompt) do
    case String.split(prompt, ~r/\n/) do
      [first | _] -> "#{String.trim_trailing(Console.truncate(first, 500), "...")}..."
      _ -> Console.truncate(prompt, 500)
    end
  end

  EEx.function_from_file(:defp, :pr_blob, Path.join([:code.priv_dir(:console), "pr", "agent_review.md.eex"]), [:assigns])

  defp notify({:ok, %AgentRun{} = run}, :create),
    do: handle_notify(PubSub.AgentRunCreated, run)
  defp notify({:ok, %PullRequest{} = pr}, :create),
    do: handle_notify(PubSub.PullRequestCreated, pr)
  defp notify({:ok, %AgentRun{} = run}, :update),
    do: handle_notify(PubSub.AgentRunUpdated, run)
  defp notify({:ok, %AgentMessage{} = msg}, :create),
    do: handle_notify(PubSub.AgentMessageCreated, msg)
  defp notify(pass, _), do: pass
end
