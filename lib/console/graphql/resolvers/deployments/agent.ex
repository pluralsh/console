defmodule Console.GraphQl.Resolvers.Deployments.Agent do
  use Console.GraphQl.Resolvers.Deployments.Base
  import Console.Deployments.Policies, only: [allow: 3]
  alias Console.Deployments.Agents
  alias Console.Schema.{AgentRuntime, AgentRun, Cluster}

  def agent_runtimes(args, %{context: %{current_user: user}}) do
    AgentRuntime.ordered()
    |> AgentRuntime.for_user(user)
    |> maybe_search(AgentRuntime, args)
    |> runtime_filters(args)
    |> paginate(args)
  end

  def agent_runtime(%{id: id}, ctx) do
    Agents.get_agent_runtime!(id)
    |> allow(actor(ctx), :create)
  end

  def agent_run(%{id: id}, ctx) do
    Agents.get_agent_run!(id)
    |> allow(actor(ctx), :read)
  end

  def session_runs(%{id: id}, args, _) do
    AgentRun.for_session(id)
    |> paginate(args)
  end

  def agent_scm_credentials(%AgentRun{} = run, _, %{context: %{cluster: cluster}}),
    do: Agents.scm_creds(run, cluster)
  def agent_scm_credentials(_, _, _),
    do: {:error, "SCM credentials can only be fetched by the runner cluster"}

  def agent_plural_creds(%AgentRun{} = run, _, ctx), do: Agents.plural_creds(run, actor(ctx))

  def pending_agent_runs(%AgentRuntime{id: id, cluster_id: cid}, args, %{context: %{cluster: %Cluster{id: cid}}}) do
    AgentRun.for_runtime(id)
    |> AgentRun.for_status(:pending)
    |> paginate(args)
  end
  def pending_agent_runs(_, _, _), do: {:error, "Pending runs can only be fetched by its parent cluster"}

  def agent_runs(args, %{context: %{current_user: user}}) do
    AgentRun.ordered()
    |> AgentRun.for_user(user.id)
    |> paginate(args)
  end

  def shared_agent_run(%{id: id}, %{context: %{current_user: _}}) do
    case Agents.get_agent_run!(id) do
      %AgentRun{shared: true} = run -> {:ok, run}
      _ -> {:error, "Agent run is not shared"}
    end
  end

  def upsert_agent_runtime(%{attributes: attrs}, %{context: %{cluster: cluster}}),
    do: Agents.upsert_agent_runtime(attrs, cluster)

  def delete_agent_runtime(%{id: id}, %{context: %{cluster: cluster}}),
    do: Agents.delete_agent_runtime(id, cluster)

  def update_agent_run(%{id: id, attributes: attrs}, %{context: %{cluster: cluster}}),
    do: Agents.update_agent_run(attrs, id, cluster)

  def cancel_agent_run(%{id: id}, %{context: %{current_user: user}}),
    do: Agents.cancel_agent_run(id, user)

  def create_agent_run(%{runtime_id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Agents.create_agent_run(attrs, id, user)

  def agent_pull_request(%{run_id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Agents.agent_pull_request(attrs, id, user)

  def update_agent_run_analysis(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Agents.update_analysis(attrs, id, user)

  def update_agent_run_todos(%{id: id, todos: todos}, %{context: %{current_user: user}}),
    do: Agents.update_todos(todos, id, user)

  def share_agent_run(%{id: id}, %{context: %{current_user: user}}),
    do: Agents.share_agent_run(id, user)

  def create_agent_message(%{run_id: id, attributes: attrs}, %{context: %{cluster: cluster}}),
    do: Agents.create_agent_message(attrs, id, cluster)

  defp runtime_filters(query, args) do
    Enum.reduce(args, query, fn
      {:type, t}, q when not is_nil(t) -> AgentRuntime.for_type(q, t)
      _, q -> q
    end)
  end
end
