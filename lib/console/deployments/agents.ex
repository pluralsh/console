defmodule Console.Deployments.Agents do
  use Console.Services.Base
  import Console.Deployments.Policies
  import Console.Deployments.Pr.Git, only: [backfill_token: 1]
  alias Console.Services.Users
  alias Console.Deployments.{Clusters, Pr.Dispatcher}
  alias Console.AI.Tool
  alias Kazan.Apis.Core.V1, as: CoreV1
  alias Console.Schema.{
    AgentRuntime,
    AgentRun,
    Cluster,
    User,
    Group,
    ScmConnection,
    PullRequest
  }

  @type error :: Console.error
  @type agent_run_resp :: {:ok, AgentRun.t} | error
  @type agent_runtime_resp :: {:ok, AgentRuntime.t} | error

  def get_agent_runtime!(id), do: Repo.get!(AgentRuntime, id)

  def get_agent_runtime(cluster_id, name),
    do: Repo.get_by(AgentRuntime, cluster_id: cluster_id, name: name)

  def get_agent_run!(id), do: Repo.get!(AgentRun, id)

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
    |> execute(extract: :run)
  end

  @doc """
  Updates an agent run, can only be performed by deployment operators
  """
  @spec update_agent_run(map, binary, Cluster.t) :: agent_run_resp
  def update_agent_run(attrs, run_id, %Cluster{id: cluster_id}) do
    start_transaction()
    |> add_operation(:run, fn _ ->
      get_agent_run!(run_id)
      |> Repo.preload([:runtime])
      |> case do
        %AgentRun{runtime: %AgentRuntime{cluster_id: ^cluster_id}} = run ->
          {:ok, run}
        _ -> {:error, "clusters can only update their own agent runs"}
      end
    end)
    |> add_operation(:update, fn %{run: run} ->
      AgentRun.changeset(run, attrs)
      |> Repo.update()
    end)
    |> execute(extract: :update)
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
  end

  def agent_pull_request(%{title: t, body: b, repository: r, base: ba, head: he}, run_id, %User{} = user) do
    run = get_agent_run!(run_id)
    with {:ok, run} <- allow(run, user, :creds),
         %ScmConnection{} = conn <- Tool.scm_connection(),
         {:ok, conn} <- backfill_token(conn),
         {:ok, pr_info} <- Dispatcher.pr(conn, t, b, r, ba, he) do
      %PullRequest{}
      |> PullRequest.changeset(
        Map.merge(pr_info, Map.take(run, ~w(flow_id)a))
        |> Map.put(:agent_run_id, run.id)
      )
      |> Repo.insert()
    else
      nil -> {:error, "no scm connection found"}
      err -> err
    end
  end

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
end
