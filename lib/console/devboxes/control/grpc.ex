defmodule Console.Devboxes.Control.Grpc do
  @moduledoc """
  The real `Console.Devboxes.Control`: `devbox.v1.Control` calls to KAS's internal api, which forwards them to the
  owning cluster's devbox gateway.  Every call is signed with the shared KAS secret and names its cluster in
  `devbox-cluster-id` (see `Console.GRPC.Devbox.Auth`).

  The connection is a supervised `GRPC.Client.Connection` registered under this module's name and started when
  `KAS_DEVBOX_GRPC_ADDR` is set.  Failures map to the behaviour's errors: `UNAVAILABLE` (or an unreachable KAS)
  and `ErrorDetail{CLUSTER_OFFLINE}` become `{:error, :not_connected}`, `UNIMPLEMENTED` and
  `ErrorDetail{UNSUPPORTED}` become `{:error, :unsupported}`.
  """
  @behaviour Console.Devboxes.Control
  require Logger
  alias Console.Repo
  alias Console.Devboxes.Ingest
  alias Console.GRPC.Devbox.{Auth, Proto}
  alias Console.Schema.{
    Devbox,
    DevboxInstance,
    DevboxInstanceSession,
    DevboxInstanceInteraction,
    DevboxSnapshot,
    User
  }
  alias :"Elixir.Devbox.V1", as: V1
  alias :"Elixir.Devbox.V1.Control.Stub", as: Stub

  @timeout :timer.seconds(30)
  @unavailable GRPC.Status.unavailable()
  @unimplemented GRPC.Status.unimplemented()

  def adapter, do: GRPC.Client.Adapters.Gun

  def adapter_opts, do: [connect_timeout: :timer.seconds(5), http2_opts: %{keepalive: :timer.seconds(15), keepalive_tolerance: 2}]

  @doc "The child spec for the supervised KAS connection, or none if no address is configured"
  @spec child_specs(binary | nil) :: [term]
  def child_specs(target) when is_binary(target) and byte_size(target) > 0 do
    [{GRPC.Client.Connection, name: __MODULE__, target: target, adapter: adapter(), adapter_opts: adapter_opts()}]
  end
  def child_specs(_), do: []

  ## instances

  @impl true
  def create_instance(%DevboxInstance{} = inst, opts) do
    %{devbox: devbox, user: user} = inst = Repo.preload(inst, [:devbox, :user])
    devbox = opts[:devbox] || devbox
    req = %V1.CreateInstanceRequest{
      instance_id: inst.id,
      devbox_id: inst.devbox_id,
      workbench_id: inst.workbench_id,
      owner: principal(user),
      runner_name: devbox.name,
      agent: Proto.enum(inst.agent, V1.AgentType),
      model: Proto.str(inst.requested_model),
      config_options: config_settings(inst.config_options),
      agents: agent_launches(inst),
      repositories: Enum.map(inst.repositories || [], &%V1.RepositorySpec{url: &1}),
      allowed_repositories: devbox.allowed_repositories || [],
      idle_policy: idle_policy(opts[:idle_policy] || Devbox.idle_policy(devbox)),
      max_running_threads: inst.max_running_threads || 0,
      idempotency_key: inst.id
    }

    case opts[:snapshot] do
      %DevboxSnapshot{} = snap ->
        call(devbox.cluster_id, :start_from_snapshot, %V1.StartFromSnapshotRequest{
          instance: req,
          snapshot: snapshot_ref(snap)
        })
      _ -> call(devbox.cluster_id, :create_instance, req)
    end
    |> to_map()
  end

  @impl true
  def cancel_instance(inst), do: instance_action(inst, :cancel_instance)
  @impl true
  def suspend_instance(inst), do: instance_action(inst, :suspend_instance, :user)
  @impl true
  def resume_instance(inst), do: instance_action(inst, :resume_instance)

  defp instance_action(inst, rpc, reason \\ nil) do
    req = %V1.InstanceActionRequest{instance_id: inst.id, reason: Proto.enum(reason, V1.SuspendReason)}
    call(cluster_id(inst), rpc, req) |> to_map()
  end

  @impl true
  def snapshot_instance(inst, %DevboxSnapshot{} = snap) do
    req = %V1.SnapshotInstanceRequest{instance_id: inst.id, snapshot_id: snap.id, name: Proto.str(snap.name)}
    call(cluster_id(inst), :snapshot_instance, req) |> to_map()
  end

  @impl true
  def delete_snapshot(%DevboxSnapshot{} = snap) do
    %{devbox: %Devbox{cluster_id: cid}} = Repo.preload(snap, [:devbox])
    call(cid, :delete_snapshot, %V1.DeleteSnapshotRequest{snapshot: snapshot_ref(snap)}) |> to_map()
  end

  @impl true
  def set_agent_billing(inst, launch) do
    req = %V1.SetAgentBillingRequest{instance_id: inst.id, agent: agent_launch(launch), requested_by: principal(launch[:principal])}
    call(cluster_id(inst), :set_agent_billing, req) |> to_map()
  end

  @impl true
  def push_credential(_inst, _credential),
    do: {:error, :unsupported}

  ## threads

  @impl true
  def create_thread(inst, %DevboxInstanceSession{} = thread, opts) do
    req = %V1.CreateThreadRequest{
      instance_id: inst.id,
      thread_id: thread.id,
      agent: Proto.enum(thread.agent, V1.AgentType),
      model: Proto.str(opts[:model]),
      config_options: config_settings(opts[:config_options]),
      title: Proto.str(thread.user_title),
      cwd: Proto.str(thread.cwd),
      worktree_repos: thread.worktree_repos || [],
      created_by: principal(opts[:principal]),
      resume_if_suspended: true
    }

    with {:ok, %V1.ThreadResponse{session: session}} <- call(cluster_id(inst), :create_thread, req),
         session_id = session && Proto.to_map(session.session_id),
         :ok <- first_prompt(inst, %{thread | acp_session_id: session_id}, opts) do
      {:ok, %{session_id: session_id}}
    end
  end

  defp first_prompt(inst, thread, %{prompt: [_ | _] = prompt}) do
    case send_prompt(inst, thread, prompt, []) do
      {:ok, _} -> :ok
      err -> err
    end
  end
  defp first_prompt(_, _, _), do: :ok

  @impl true
  def list_sessions(inst) do
    with {:ok, %V1.ListThreadsResponse{importable: importable}} <-
           call(cluster_id(inst), :list_threads, %V1.ListThreadsRequest{instance_id: inst.id, include_importable: true}) do
      {:ok, Enum.map(importable, fn s ->
        s = Proto.to_map(s)
        %{agent: Ingest.enum(s.agent, "agent_type_"), session_id: s.session_id, title: s.title, cwd: s.cwd, updated_at: s.updated_at}
      end)}
    end
  end

  @impl true
  def import_thread(inst, thread) do
    req = %V1.ImportThreadRequest{
      instance_id: inst.id,
      thread_id: thread.id,
      agent: Proto.enum(thread.agent, V1.AgentType),
      agent_session_id: Proto.str(thread.acp_session_id),
      resume_if_suspended: true
    }
    call(cluster_id(inst), :import_thread, req) |> to_map()
  end

  @impl true
  def resume_thread(inst, thread) do
    req = %V1.ResumeThreadRequest{thread: thread_ref(inst, thread), resume_if_suspended: true}
    call(cluster_id(inst), :resume_thread, req) |> to_map()
  end

  @impl true
  def close_thread(inst, thread), do: thread_action(inst, thread, :close_thread)
  @impl true
  def delete_thread(inst, thread), do: thread_action(inst, thread, :delete_thread)

  defp thread_action(inst, thread, rpc),
    do: call(cluster_id(inst), rpc, %V1.ThreadActionRequest{thread: thread_ref(inst, thread)}) |> to_map()

  @impl true
  def fork_thread(inst, source, target) do
    req = %V1.ForkThreadRequest{
      thread: thread_ref(inst, source),
      new_thread_id: target.id,
      title: Proto.str(target.user_title),
      resume_if_suspended: true
    }
    with {:ok, %V1.ThreadResponse{session: session}} <- call(cluster_id(inst), :fork_thread, req),
      do: {:ok, %{session_id: session && Proto.to_map(session.session_id)}}
  end

  @impl true
  def send_prompt(inst, thread, prompt, attachments) do
    req = %V1.PromptRequest{
      thread: thread_ref(inst, thread),
      prompt_id: Ecto.UUID.generate(),
      content: Enum.map(prompt, &content_block/1),
      attachments: Enum.map(attachments, &%V1.PromptAttachment{name: &1.name, mime_type: &1.mime_type, data: &1.data}),
      resume_if_suspended: true
    }
    call(cluster_id(inst), :prompt, req) |> to_map()
  end

  @impl true
  def cancel_prompt(inst, thread),
    do: call(cluster_id(inst), :cancel_prompt, %V1.CancelPromptRequest{thread: thread_ref(inst, thread)}) |> to_map()

  @impl true
  def set_config_option(inst, thread, config_id, value) do
    req = %V1.SetThreadConfigOptionRequest{
      thread: thread_ref(inst, thread),
      option: %V1.ConfigOptionSetting{config_id: config_id, value: value},
      resume_if_suspended: true
    }
    call(cluster_id(inst), :set_thread_config_option, req) |> to_map()
  end

  @impl true
  def respond(inst, %DevboxInstanceInteraction{} = interaction, response) do
    %{session: session} = Repo.preload(interaction, [:session])
    req = %V1.RespondInteractionRequest{
      instance_id: inst.id,
      interaction_id: interaction.external_id,
      session_id: Proto.str(session && session.acp_session_id),
      response: interaction_response(response),
      answered_by: principal(response[:principal]),
      resume_if_suspended: true
    }
    call(cluster_id(inst), :respond_interaction, req) |> to_map()
  end

  @impl true
  def list_commands(inst, thread) do
    req = %V1.ListCommandsRequest{thread: thread_ref(inst, thread), session_id: Proto.str(thread.acp_session_id)}
    with {:ok, %V1.ListCommandsResponse{commands: commands}} <- call(cluster_id(inst), :list_commands, req) do
      {:ok, Enum.map(Proto.to_map(commands), fn c ->
        %{name: c.name, description: c.description, input_hint: c[:input] && c.input[:hint]}
      end)}
    end
  end

  ## reads

  @impl true
  def get_timeline(inst, session_id, opts) do
    req = %V1.GetTimelineRequest{
      instance_id: inst.id,
      session_id: session_id,
      cursor: timeline_cursor(opts),
      limit: opts[:limit] || 0,
      resume_if_suspended: true
    }
    call(cluster_id(inst), :get_timeline, req) |> to_map()
  end

  defp timeline_cursor(%{before: before}) when is_integer(before), do: {:before_position, before}
  defp timeline_cursor(%{after: aft}) when is_integer(aft), do: {:after_position, aft}
  defp timeline_cursor(_), do: nil

  @impl true
  def get_sessions(inst) do
    with {:ok, %V1.GetSessionsResponse{sessions: sessions}} <-
           call(cluster_id(inst), :get_sessions, %V1.GetSessionsRequest{instance_id: inst.id}),
      do: {:ok, Proto.to_map(sessions)}
  end

  @impl true
  def set_instance_leases(inst, %{generation: gen, leases: leases}) do
    req = %V1.SetInstanceLeasesRequest{
      instance_id: inst.id,
      generation: gen || 0,
      leases: Enum.map(leases, &Console.GRPC.Devbox.Ingest.lease/1)
    }
    call(cluster_id(inst), :set_instance_leases, req) |> to_map()
  end

  ## workspace

  @impl true
  def add_repository(inst, repository) do
    req = %V1.AddRepositoryRequest{
      instance_id: inst.id,
      repository: %V1.RepositorySpec{url: repository},
      idempotency_key: "#{inst.id}:#{repository}"
    }
    call(cluster_id(inst), :add_repository, req) |> to_map()
  end

  @impl true
  def list_repositories(inst) do
    with {:ok, %V1.ListRepositoriesResponse{checkouts: checkouts}} <-
           call(cluster_id(inst), :list_repositories, %V1.ListRepositoriesRequest{instance_id: inst.id}) do
      {:ok, Enum.map(Proto.to_map(checkouts), &Map.merge(&1, %{remote: &1[:remote_url], sha: &1[:head_sha]}))}
    end
  end

  @impl true
  def list_files(inst, path) do
    req = %V1.ListFilesRequest{instance_id: inst.id, path: Proto.str(path), depth: 1, respect_gitignore: true}
    with {:ok, %V1.ListFilesResponse{entries: entries}} <- call(cluster_id(inst), :list_files, req),
      do: {:ok, Enum.map(entries, &file_entry/1)}
  end

  @impl true
  def read_file(inst, path, opts) do
    req = %V1.ReadFileRequest{instance_id: inst.id, path: path, offset: opts[:offset] || 0, limit: opts[:limit] || 0}
    with {:ok, %V1.ReadFileResponse{} = resp} <- call(cluster_id(inst), :read_file, req) do
      {:ok, %{
        entry: resp.entry && file_entry(resp.entry),
        content: resp.content,
        sha256: Proto.to_map(resp.sha256),
        truncated: resp.truncated,
        mime_type: Proto.to_map(resp.mime_type),
        binary: resp.binary
      }}
    end
  end

  @impl true
  def write_file(inst, path, content, opts) do
    req = %V1.WriteFileRequest{
      instance_id: inst.id,
      path: path,
      content: content,
      expected_sha256: opts[:expected_sha256],
      create_parents: true,
      written_by: principal(opts[:principal])
    }
    with {:ok, %V1.WriteFileResponse{} = resp} <- call(cluster_id(inst), :write_file, req),
      do: {:ok, %{entry: resp.entry && file_entry(resp.entry), sha256: Proto.to_map(resp.sha256)}}
  end

  @impl true
  def get_changes(inst, opts) do
    req = %V1.GetChangesRequest{
      instance_id: inst.id,
      thread_id: Proto.str(opts[:thread_id]),
      repositories: opts[:repositories] || [],
      include_diff: !!opts[:include_diff],
      path: Proto.str(opts[:path])
    }
    with {:ok, %V1.GetChangesResponse{repositories: repos}} <- call(cluster_id(inst), :get_changes, req) do
      {:ok, Enum.map(Proto.to_map(repos), fn repo ->
        %{repo | files: Enum.map(repo.files || [], &Map.update(&1, :status, nil, fn s -> Ingest.enum(s, "change_status_") end))}
      end)}
    end
  end

  ## streams

  @impl true
  def open_stream(inst, kind, opts) do
    req = %V1.OpenStreamRequest{
      instance_id: inst.id,
      kind: Proto.enum(kind, V1.StreamKind),
      terminal_id: Proto.str(opts[:terminal_id]),
      create_terminal: create_terminal(inst, kind, opts),
      port: opts[:port] || 0,
      start_browser: kind == :vnc && %V1.StartBrowserRequest{instance_id: inst.id, url: Proto.str(opts[:url])} || nil,
      requested_by: principal(opts[:principal]),
      resume_if_suspended: true
    }
    with {:ok, %V1.OpenStreamResponse{} = resp} <- call(cluster_id(inst), :open_stream, req) do
      resp = Proto.to_map(resp)
      {:ok, %{resp | kind: Ingest.enum(resp.kind, "stream_kind_") || kind}}
    end
  end

  defp create_terminal(inst, :terminal, opts) do
    case opts[:terminal_id] do
      nil -> %V1.CreateTerminalRequest{instance_id: inst.id, created_by: principal(opts[:principal])}
      _ -> nil
    end
  end
  defp create_terminal(_, _, _), do: nil

  ## transport

  @doc false
  def call(cluster_id, rpc, req) do
    with {:ok, channel} <- connect(),
         {:ok, metadata} <- Auth.control_metadata(cluster_id) do
      apply(Stub, rpc, [channel, req, [metadata: metadata, timeout: @timeout]])
      |> result()
    end
  end

  defp connect() do
    with {:ok, channel} <- GRPC.Client.Connection.get_channel(__MODULE__),
         :ok <- GRPC.Client.Connection.await_ready(channel) do
      {:ok, channel}
    else
      err ->
        Logger.info("devbox control connection to kas is unavailable: #{inspect(err)}")
        {:error, :not_connected}
    end
  end

  @doc false
  def result({:ok, resp}), do: {:ok, resp}
  def result({:ok, resp, _}), do: {:ok, resp}
  def result({:error, %GRPC.RPCError{} = err}), do: rpc_error(err, error_detail(err))
  def result({:error, :not_connected}), do: {:error, :not_connected}
  def result({:error, err}) do
    Logger.info("devbox control call failed: #{inspect(err)}")
    {:error, :not_connected}
  end

  defp rpc_error(_, %V1.ErrorDetail{reason: :ERROR_REASON_CLUSTER_OFFLINE}), do: {:error, :not_connected}
  defp rpc_error(_, %V1.ErrorDetail{reason: :ERROR_REASON_INSTANCE_SUSPENDED}), do: {:error, :suspended}
  defp rpc_error(_, %V1.ErrorDetail{reason: :ERROR_REASON_UNSUPPORTED, message: msg}) when byte_size(msg) > 0,
    do: {:error, {:unsupported, msg}}
  defp rpc_error(_, %V1.ErrorDetail{reason: :ERROR_REASON_UNSUPPORTED}), do: {:error, :unsupported}
  defp rpc_error(%GRPC.RPCError{status: @unavailable}, _), do: {:error, :not_connected}
  defp rpc_error(%GRPC.RPCError{status: @unimplemented}, _), do: {:error, :unsupported}
  defp rpc_error(_, %V1.ErrorDetail{message: msg}) when byte_size(msg) > 0, do: {:error, msg}
  defp rpc_error(%GRPC.RPCError{message: msg}, _), do: {:error, msg}

  @doc false
  def error_detail(%GRPC.RPCError{details: [_ | _] = details}) do
    Enum.find_value(details, fn
      %Google.Protobuf.Any{type_url: url, value: value} ->
        case String.ends_with?(url, "devbox.v1.ErrorDetail") do
          true -> V1.ErrorDetail.decode(value)
          false -> nil
        end
      _ -> nil
    end)
  end
  def error_detail(_), do: nil

  ## builders

  defp to_map({:ok, resp}), do: {:ok, Proto.to_map(resp)}
  defp to_map(err), do: err

  defp cluster_id(%DevboxInstance{devbox: %Devbox{cluster_id: cid}}), do: cid
  defp cluster_id(%DevboxInstance{} = inst), do: cluster_id(Repo.preload(inst, [:devbox]))

  defp thread_ref(inst, %DevboxInstanceSession{} = thread),
    do: %V1.ThreadRef{instance_id: inst.id, thread_id: thread.id, session_id: Proto.str(thread.acp_session_id)}

  defp principal(%User{id: id, email: email, name: name}), do: %V1.Principal{user_id: id, email: Proto.str(email), name: Proto.str(name)}
  defp principal(%{user_id: id} = p), do: %V1.Principal{user_id: Proto.str(id), email: Proto.str(p[:email]), name: Proto.str(p[:name])}
  defp principal(_), do: nil

  defp config_settings(nil), do: []
  defp config_settings(%{} = opts), do: Enum.map(opts, fn {k, v} -> %V1.ConfigOptionSetting{config_id: to_string(k), value: to_string(v)} end)
  defp config_settings(opts) when is_list(opts),
    do: Enum.map(opts, &%V1.ConfigOptionSetting{config_id: to_string(&1[:config_id]), value: to_string(&1[:value])})

  defp idle_policy(policy) do
    %V1.IdlePolicy{
      activity_window: Proto.duration(policy[:activity_window]),
      cpu_threshold_percent: (policy[:cpu_threshold] || 0) / 1,
      grace_period: Proto.duration(policy[:grace_period]),
      max_deferral: Proto.duration(policy[:max_deferral]),
      max_continuous_awake: Proto.duration(policy[:max_continuous_awake]),
      complete_after: Proto.duration(policy[:complete_after])
    }
  end

  defp snapshot_ref(%DevboxSnapshot{} = snap) do
    %V1.SnapshotRef{
      snapshot_id: snap.id,
      tag: Proto.str(snap.tag_ref),
      template_revision: revision(snap.template_revision),
      fidelity: Proto.enum(snap.fidelity, V1.SnapshotFidelity)
    }
  end

  defp revision(nil), do: 0
  defp revision(rev) when is_binary(rev) do
    case Integer.parse(rev) do
      {n, _} -> n
      :error -> 0
    end
  end

  defp agent_launches(%DevboxInstance{agent_billing: %{} = billing}) do
    Enum.map(billing, fn {agent, launch} -> agent_launch(Console.Devboxes.Billing.launch(agent, launch)) end)
  end
  defp agent_launches(_), do: []

  defp agent_launch(launch) do
    %V1.AgentLaunch{
      agent: Proto.enum(launch[:agent], V1.AgentType),
      billing: Proto.enum(launch[:billing], V1.BillingMode),
      credential_id: Proto.str(launch[:credential_id]),
      credential_kind: Proto.str(launch[:credential_kind]),
      allow_collaborators: !!launch[:allow_collaborators]
    }
  end

  defp interaction_response(%{option_id: id}),
    do: %V1.InteractionResponse{response: {:permission, %V1.PermissionOutcome{outcome: {:selected_option_id, id}}}}
  defp interaction_response(%{cancelled: true}),
    do: %V1.InteractionResponse{response: {:permission, %V1.PermissionOutcome{outcome: {:cancelled, true}}}}
  defp interaction_response(%{action: action} = resp),
    do: %V1.InteractionResponse{response: {:elicitation, %V1.ElicitationResponse{action: to_string(action), content: Proto.struct(resp[:content])}}}

  defp file_entry(%V1.FileEntry{} = entry) do
    entry = Proto.to_map(entry)
    %{entry | type: Ingest.enum(entry.type, "file_type_")}
  end

  defp content_block(%{"type" => "text"} = b), do: %V1.ContentBlock{block: {:text, %V1.TextContent{text: b["text"] || ""}}}
  defp content_block(%{"type" => "image"} = b),
    do: %V1.ContentBlock{block: {:image, %V1.ImageContent{data: Proto.str(b["data"]), mime_type: Proto.str(b["mimeType"]), uri: Proto.str(b["uri"])}}}
  defp content_block(%{"type" => "audio"} = b),
    do: %V1.ContentBlock{block: {:audio, %V1.AudioContent{data: Proto.str(b["data"]), mime_type: Proto.str(b["mimeType"])}}}
  defp content_block(%{"type" => "resource_link"} = b),
    do: %V1.ContentBlock{block: {:resource_link, %V1.ResourceLink{uri: Proto.str(b["uri"]), name: Proto.str(b["name"]), mime_type: Proto.str(b["mimeType"])}}}
  defp content_block(%{"type" => "resource", "resource" => %{"blob" => blob} = r}) when is_binary(blob) do
    res = %V1.BlobResourceContents{uri: Proto.str(r["uri"]), mime_type: Proto.str(r["mimeType"]), blob: blob}
    %V1.ContentBlock{block: {:resource, %V1.EmbeddedResource{resource: {:blob, res}}}}
  end
  defp content_block(%{"type" => "resource", "resource" => r}) do
    res = %V1.TextResourceContents{uri: Proto.str(r["uri"]), mime_type: Proto.str(r["mimeType"]), text: Proto.str(r["text"])}
    %V1.ContentBlock{block: {:resource, %V1.EmbeddedResource{resource: {:text, res}}}}
  end
  defp content_block(b), do: %V1.ContentBlock{block: {:unknown, %V1.UnknownVariant{type: Proto.str(b["type"]), raw_json: Jason.encode!(b)}}}
end
