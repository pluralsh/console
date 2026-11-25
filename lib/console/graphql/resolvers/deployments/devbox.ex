defmodule Console.GraphQl.Resolvers.Deployments.Devbox do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Devboxes
  alias Console.Devboxes.{AgentCredentials, Billing, Ingest, Threads, Workspace}
  alias Console.WorkloadIdentity.Snippets
  alias Console.Schema.{
    Devbox,
    DevboxInstance,
    DevboxInstanceSession,
    DevboxInstanceInteraction,
    DevboxSnapshot,
    User
  }

  def resolve_devbox(%{id: id}, ctx) when is_binary(id), do: Devboxes.fetch_devbox(id, actor(ctx))
  def resolve_devbox(%{name: name}, %{context: %{cluster: cluster}}) when is_binary(name) do
    case Devboxes.get_devbox_by_name(cluster.id, name) do
      %Devbox{} = devbox -> {:ok, devbox}
      nil -> {:error, "no devbox named #{name} on this cluster"}
    end
  end
  def resolve_devbox(%{name: name, cluster_id: cid}, ctx) when is_binary(name) and is_binary(cid) do
    case Devboxes.get_devbox_by_name(cid, name) do
      %Devbox{} = devbox -> allow(devbox, actor(ctx), :read)
      nil -> {:error, "no devbox named #{name} on this cluster"}
    end
  end
  def resolve_devbox(_, _), do: {:error, "must specify either id or name"}

  def list_devboxes(args, %{context: %{current_user: user}}) do
    with {:ok, _} <- allow(%Devbox{}, user, :read) do
      Devbox.ordered()
      |> maybe_search(Devbox, args)
      |> devbox_filters(args)
      |> paginate(args)
    end
  end

  defp devbox_filters(query, args) do
    Enum.reduce(args, query, fn
      {:cluster_id, cid}, q when is_binary(cid) -> Devbox.for_cluster(q, cid)
      {:workbench_id, wid}, q when is_binary(wid) -> Devbox.for_workbench(q, wid)
      _, q -> q
    end)
  end

  def devbox_agents(%{workbench_id: wid, devbox_id: did}, %{context: %{current_user: user}}) do
    with {:ok, _} <- allow(Console.Deployments.Workbenches.get_workbench!(wid), user, :read),
         %Console.Schema.WorkbenchDevbox{} <- Console.Repo.get_by(Console.Schema.WorkbenchDevbox, workbench_id: wid, devbox_id: did),
         %Devbox{agents: agents} <- Devboxes.get_devbox!(did) do
      {:ok, agents || []}
    else
      nil -> {:error, "this devbox is not attached to the workbench"}
      err -> err
    end
  end

  def offered_models(%Devbox.Agent{} = agent, args, _) do
    names = Map.new(agent.models || [], & {&1.id, &1})
    Devboxes.offered_models(agent, args[:billing] || :proxy)
    |> Enum.map(fn id -> Map.get(names, id, %{id: id, name: id, description: nil}) end)
    |> ok()
  end

  def devbox_default_model(%Devbox.Agent{} = agent, args, _),
    do: {:ok, Devboxes.default_model(agent, args[:billing] || :proxy)}

  def upsert_devbox(%{attributes: attrs}, ctx),
    do: Devboxes.upsert_devbox(attrs, fetch_cluster(attrs, ctx), actor(ctx))

  def heartbeat_devbox(%{id: id, attributes: attrs}, %{context: %{cluster: cluster}}),
    do: Devboxes.heartbeat_devbox(attrs, id, cluster)

  def delete_devbox(%{id: id}, ctx), do: Devboxes.delete_devbox(id, actor(ctx))

  def mint_devbox_probe_token(%{id: id}, %{context: %{cluster: cluster}}) do
    with {:ok, token, exp} <- Devboxes.mint_probe_token(id, cluster),
      do: {:ok, %{token: token, expires_at: exp}}
  end

  def attach_devbox(%{workbench_id: wid, devbox_id: did}, %{context: %{current_user: user}}) do
    with {:ok, _} <- Devboxes.attach_devbox(wid, did, user),
      do: {:ok, Devboxes.get_devbox!(did)}
  end

  def detach_devbox(%{workbench_id: wid, devbox_id: did}, %{context: %{current_user: user}}) do
    with {:ok, _} <- Devboxes.detach_devbox(wid, did, user),
      do: {:ok, Devboxes.get_devbox!(did)}
  end

  def devbox_instance(%{id: id}, ctx), do: Devboxes.fetch_instance(id, actor(ctx))

  def list_workbench_devbox_instances(workbench, args, %{context: %{current_user: user}}) do
    DevboxInstance.for_workbench(workbench.id)
    |> instance_filters(args, user)
    |> DevboxInstance.ordered()
    |> paginate(args)
  end

  defp instance_filters(query, args, %User{id: user_id}) do
    query = case args do
      %{statuses: [_ | _]} -> query
      %{include_ended: true} -> query
      _ -> DevboxInstance.live(query)
    end

    Enum.reduce(args, query, fn
      {:statuses, [_ | _] = statuses}, q -> DevboxInstance.for_statuses(q, statuses)
      {:mine, true}, q -> DevboxInstance.for_user(q, user_id)
      _, q -> q
    end)
  end

  def list_workbench_devbox_snapshots(workbench, args, _) do
    DevboxSnapshot.for_workbench(workbench.id)
    |> DevboxSnapshot.ordered()
    |> paginate(args)
  end

  def workbench_devbox_inbox(workbench, _, _) do
    DevboxInstanceInteraction.for_workbench(workbench.id)
    |> DevboxInstanceInteraction.pending()
    |> DevboxInstanceInteraction.ordered()
    |> Console.Repo.all()
    |> ok()
  end

  def devbox_instance_threads(%DevboxInstance{id: id}, args, _) do
    DevboxInstanceSession.for_instance(id)
    |> thread_filters(args)
    |> DevboxInstanceSession.ordered(desc: :inserted_at)
    |> Console.Repo.all()
    |> ok()
  end

  defp thread_filters(query, args) do
    Enum.reduce(args, maybe_visible(query, args), fn
      {:stages, [_ | _] = stages}, q -> DevboxInstanceSession.for_stages(q, stages)
      _, q -> q
    end)
  end

  defp maybe_visible(query, %{include_deleted: true}), do: query
  defp maybe_visible(query, _), do: DevboxInstanceSession.visible(query)

  def devbox_instance_interactions(%DevboxInstance{id: id}, args, _) do
    DevboxInstanceInteraction.for_instance(id)
    |> interaction_filters(args)
    |> DevboxInstanceInteraction.ordered()
    |> Console.Repo.all()
    |> ok()
  end

  defp interaction_filters(query, %{pending: true}), do: DevboxInstanceInteraction.pending(query)
  defp interaction_filters(query, _), do: query

  def devbox_viewer_count(%DevboxInstance{viewers: %{} = viewers}, _, _) do
    now = DateTime.utc_now()
    Enum.count(viewers, fn {_, exp} ->
      case DateTime.from_iso8601(exp) do
        {:ok, dt, _} -> DateTime.compare(dt, now) == :gt
        _ -> false
      end
    end)
    |> ok()
  end
  def devbox_viewer_count(_, _, _), do: {:ok, 0}

  def devbox_leases(%DevboxInstance{} = inst, _, _), do: {:ok, Devboxes.leases(inst)}

  def devbox_thread_title(%DevboxInstanceSession{} = thread, _, _), do: {:ok, DevboxInstanceSession.display_title(thread)}
  def devbox_thread_model(%DevboxInstanceSession{} = thread, _, _), do: {:ok, DevboxInstanceSession.model(thread)}

  def create_devbox_instance(%{workbench_id: wid, attributes: attrs}, %{context: %{current_user: user}}),
    do: Devboxes.create_instance(attrs, wid, user)

  def restore_devbox_snapshot(%{id: id} = args, %{context: %{current_user: user}}) do
    snapshot = Devboxes.get_snapshot!(id)
    Map.get(args, :attributes, %{})
    |> Map.put(:snapshot_id, snapshot.id)
    |> Devboxes.create_instance(snapshot.workbench_id, user)
  end

  def cancel_devbox_instance(%{id: id}, %{context: %{current_user: user}}), do: Devboxes.cancel_instance(id, user)
  def suspend_devbox_instance(%{id: id}, %{context: %{current_user: user}}), do: Devboxes.suspend_instance(id, user)
  def resume_devbox_instance(%{id: id}, %{context: %{current_user: user}}), do: Devboxes.resume_instance(id, user)
  def ping_devbox_instance(%{id: id}, %{context: %{current_user: user}}), do: Devboxes.ping_instance(id, user)
  def leave_devbox_instance(%{id: id}, %{context: %{current_user: user}}), do: Devboxes.leave_instance(id, user)

  def keep_devbox_instance_awake(%{id: id, until: until}, %{context: %{current_user: user}}),
    do: Devboxes.keep_awake(id, until, user)

  def create_devbox_pull_request(%{instance_id: id} = args, %{context: %{current_user: user}}),
    do: Console.Devboxes.PullRequests.create(id, args, user)

  def cancel_devbox_keep_awake(%{id: id}, %{context: %{current_user: user}}),
    do: Devboxes.cancel_keep_awake(id, user)

  def devbox_snapshot(%{id: id}, %{context: %{current_user: user}}) do
    Devboxes.get_snapshot!(id)
    |> allow(user, :read)
  end

  def create_devbox_snapshot(%{instance_id: id} = args, %{context: %{current_user: user}}),
    do: Devboxes.create_snapshot(Map.get(args, :attributes) || %{}, id, user)

  def delete_devbox_snapshot(%{id: id}, %{context: %{current_user: user}}), do: Devboxes.delete_snapshot(id, user)

  def devbox_thread(%{id: id}, %{context: %{current_user: user}}), do: Threads.fetch_thread(id, user)

  def create_devbox_thread(%{instance_id: id} = args, %{context: %{current_user: user}}) do
    attrs = Map.get(args, :attributes) || %{}
    case prompt(attrs) do
      "" -> Map.delete(attrs, :prompt)
      prompt -> Map.put(attrs, :prompt, prompt)
    end
    |> Map.delete(:content)
    |> Threads.create_thread(id, user)
  end

  def import_devbox_thread(%{instance_id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Threads.import_thread(attrs, id, user)

  def resume_devbox_thread(%{id: id}, %{context: %{current_user: user}}), do: Threads.resume_thread(id, user)
  def close_devbox_thread(%{id: id}, %{context: %{current_user: user}}), do: Threads.close_thread(id, user)
  def delete_devbox_thread(%{id: id}, %{context: %{current_user: user}}), do: Threads.delete_thread(id, user)

  def fork_devbox_thread(%{id: id} = args, %{context: %{current_user: user}}),
    do: Threads.fork_thread(id, Map.take(args, [:title]), user)

  def rename_devbox_thread(%{id: id, title: title}, %{context: %{current_user: user}}),
    do: Threads.rename_thread(id, title, user)

  def prompt_devbox_thread(%{id: id} = args, %{context: %{current_user: user}}),
    do: Threads.send_prompt(id, prompt(args), user, args[:attachments])

  defp prompt(%{content: [_ | _] = blocks}), do: blocks
  defp prompt(%{prompt: text}) when is_binary(text), do: text
  defp prompt(_), do: ""

  def cancel_devbox_prompt(%{id: id}, %{context: %{current_user: user}}), do: Threads.cancel_prompt(id, user)

  def update_devbox_queued_prompt(%{id: id, prompt_id: prompt_id, action: action} = args, %{context: %{current_user: user}}),
    do: Threads.update_queued_prompt(id, prompt_id, action, args[:text], user)

  def set_devbox_thread_config_option(%{id: id, config_id: cid, value: v}, %{context: %{current_user: user}}),
    do: Threads.set_config_option(id, cid, v, user)

  def respond_devbox_interaction(%{id: id, response: resp}, %{context: %{current_user: user}}),
    do: Threads.respond(id, resp, user)

  def devbox_instance_commands(%{thread_id: id}, %{context: %{current_user: user}}), do: Threads.list_commands(id, user)

  def add_devbox_repository(%{instance_id: id, repository: repo}, %{context: %{current_user: user}}),
    do: Threads.add_repository(id, repo, user)

  def devbox_repositories(%{instance_id: id}, %{context: %{current_user: user}}),
    do: Threads.list_repositories(id, user)

  def devbox_timeline(%{instance_id: id, session_id: sid} = args, %{context: %{current_user: user}}),
    do: Threads.timeline(id, sid, Map.take(args, [:before, :after, :limit]), user)

  def devbox_sessions(%{instance_id: id}, %{context: %{current_user: user}}) do
    with {:ok, sessions} <- Threads.sessions(id, user),
      do: {:ok, Enum.map(sessions, &session_summary/1)}
  end

  defp session_summary(%DevboxInstanceSession{} = s) do
    %{
      session_id: s.acp_session_id,
      thread_id: s.id,
      kind: s.kind,
      parent_session_id: s.parent_acp_session_id,
      agent: s.agent,
      title: DevboxInstanceSession.display_title(s),
      status: s.status,
      foreground_state: s.foreground_state,
      last_activity_at: s.last_activity_at
    }
  end
  defp session_summary(%{} = s) do
    %{
      session_id: s[:session_id],
      thread_id: s[:thread_id],
      kind: Ingest.enum(s[:kind], "session_kind_"),
      parent_session_id: s[:parent_session_id],
      agent: Ingest.enum(s[:agent], "agent_type_"),
      title: s[:title],
      status: Ingest.enum(s[:status], "thread_status_"),
      foreground_state: Ingest.enum(get_in(s, [:foreground, :state]), "foreground_state_kind_"),
      last_activity_at: Console.Devboxes.Acp.timestamp(s[:last_activity_at])
    }
  end

  def devbox_importable_sessions(%{instance_id: id}, %{context: %{current_user: user}}) do
    with {:ok, sessions} <- Threads.importable_sessions(id, user) do
      sessions
      |> Enum.map(&%{
        agent: Ingest.enum(&1[:agent], "agent_type_"),
        session_id: &1[:session_id],
        title: &1[:title],
        cwd: &1[:cwd],
        updated_at: Console.Devboxes.Acp.timestamp(&1[:updated_at])
      })
      |> ok()
    end
  end

  def devbox_instance_for_subscription(%{id: id}, ctx), do: Devboxes.fetch_instance(id, actor(ctx))

  def devbox_workload_identity(%Devbox{} = devbox, _, _), do: {:ok, Snippets.devbox(devbox)}

  def devbox_agent_billing(%DevboxInstance{} = inst, _, _) do
    Billing.launches(inst)
    |> Enum.map(&Map.drop(&1, [:credential_id]))
    |> ok()
  end

  def open_devbox_stream(%{instance_id: id, kind: kind} = args, %{context: %{current_user: user}}),
    do: Workspace.open_stream(id, kind, Map.take(args, [:terminal_id, :port, :url]), user)

  def devbox_files(%{instance_id: id} = args, %{context: %{current_user: user}}),
    do: Workspace.list_files(id, args[:path], args, user)

  def devbox_file(%{instance_id: id, path: path}, %{context: %{current_user: user}}) do
    with {:ok, file} <- Workspace.read_file(id, path, user),
      do: {:ok, text_file(file)}
  end

  defp text_file(%{binary: true} = file), do: %{file | content: nil}
  defp text_file(%{content: content} = file) when is_binary(content) do
    case String.valid?(content) do
      true -> file
      false -> %{file | content: nil, binary: true}
    end
  end
  defp text_file(file), do: file

  def write_devbox_file(%{instance_id: id, path: path, content: content} = args, %{context: %{current_user: user}}),
    do: Workspace.write_file(id, path, content, args[:expected_sha256], user)

  def devbox_changes(%{instance_id: id} = args, %{context: %{current_user: user}}),
    do: Workspace.changes(id, Map.take(args, [:thread_id, :repositories, :include_diff]), user)

  def set_devbox_agent_billing(%{instance_id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Devboxes.set_agent_billing(id, attrs, user)

  def list_agent_credentials(_, %{context: %{current_user: user}}), do: {:ok, AgentCredentials.list(user)}

  def link_agent_credential(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: AgentCredentials.link(attrs, user)

  def delete_agent_credential(%{id: id}, %{context: %{current_user: user}}),
    do: AgentCredentials.delete(id, user)

  def set_default_agent_billing(%{provider: provider, enabled: enabled}, %{context: %{current_user: user}}),
    do: AgentCredentials.set_default_billing(provider, enabled, user)
end
