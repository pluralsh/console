defmodule Console.Devboxes.Threads do
  @moduledoc """
  Threads are top-level ACP sessions in an instance that console knows about.  Console allocates the thread row,
  the gateway runs the ACP call, and the agent's own state flows back through `Ingest.UpsertInstanceIndex`.  Actions
  an agent doesn't negotiate (resume, close, fork, ...) fail with a typed `UNSUPPORTED` error.
  """
  use Console.Services.Base
  import Console.Deployments.Policies
  import Console.Devboxes, only: [control_result: 2, ensure_live: 1, resolve_config_options: 2]
  alias Console.PubSub
  alias Console.Devboxes
  alias Console.Devboxes.{Billing, Control, Error, Acp, Ingest}
  alias Console.Schema.{
    Devbox,
    DevboxInstance,
    DevboxInstanceSession,
    DevboxInstanceInteraction,
    User
  }
  alias Console.Schema.DevboxInstanceSession.ConfigOption

  @type error :: Console.error
  @type thread_resp :: {:ok, DevboxInstanceSession.t} | error

  # the daemon enforces the same limits; KAS forwards Control frames up to 32 MiB
  @max_attachments 10
  @max_attachment_bytes 24 * 1024 * 1024

  def get_thread!(id), do: Repo.get!(DevboxInstanceSession, id)
  def get_interaction!(id), do: Repo.get!(DevboxInstanceInteraction, id)

  @doc """
  Fetches a thread, requires read access to its instance's workbench.
  """
  @spec fetch_thread(binary, User.t) :: thread_resp
  def fetch_thread(id, %User{} = user), do: get_thread!(id) |> allow(user, :read)

  @doc """
  Creates a thread (`session/new`), optionally with a first prompt.  `agent` defaults to the instance's agent and
  is validated against the box's catalog, as are `model` and `config_options`.
  """
  @spec create_thread(map, binary, User.t) :: thread_resp
  def create_thread(attrs, instance_id, %User{id: user_id} = user) do
    start_transaction()
    |> add_operation(:instance, fn _ -> live_instance(instance_id) end)
    |> add_operation(:catalog, fn %{instance: inst} ->
      Devboxes.resolve_catalog(inst.devbox, Map.put_new(attrs, :agent, inst.agent), inst.agent_billing)
    end)
    |> add_operation(:autonomy, fn %{instance: inst, catalog: catalog} ->
      Devboxes.check_proxy_auto(inst, catalog.agent, catalog.config_options)
    end)
    |> add_operation(:budget, fn %{instance: inst, catalog: catalog} -> Billing.check(inst, catalog.agent, user) end)
    |> add_operation(:thread, fn %{instance: inst, catalog: catalog} ->
      %DevboxInstanceSession{instance_id: inst.id, user_id: user_id, kind: :thread}
      |> DevboxInstanceSession.changeset(%{
        agent: catalog.agent,
        cwd: attrs[:cwd] || "~",
        worktree_repos: attrs[:worktree_repos],
        user_title: attrs[:title],
        status: :active
      })
      |> allow(user, :create)
      |> when_ok(:insert)
    end)
    |> add_operation(:control, fn %{instance: inst, thread: thread, catalog: catalog} ->
      Control.create_thread(inst, thread, %{
        model: catalog.model,
        config_options: catalog.config_options,
        prompt: attrs[:prompt] && Acp.prompt(attrs[:prompt]),
        principal: principal(user)
      })
      |> Error.control_ok()
    end)
    |> add_operation(:session, fn %{thread: thread, control: result} -> attach_session(thread, result) end)
    |> execute(extract: :session)
    |> notify(:update)
  end

  defp attach_session(thread, %{session_id: id}) when is_binary(id) and byte_size(id) > 0 do
    thread
    |> DevboxInstanceSession.changeset(%{acp_session_id: id})
    |> Repo.update()
  end
  defp attach_session(thread, _) do
    thread
    |> DevboxInstanceSession.changeset(%{status: :waiting})
    |> Repo.update()
  end

  @doc """
  Sessions the instance's agents list (`session/list`) that console has no thread for yet.
  """
  @spec importable_sessions(binary, User.t) :: {:ok, [map]} | error
  def importable_sessions(instance_id, %User{} = user) do
    with {:ok, inst} <- read_instance(instance_id, user),
         {:ok, sessions} <- Control.list_sessions(inst) |> Error.control_ok() do
      known = DevboxInstanceSession.for_instance(inst.id)
              |> Repo.all()
              |> MapSet.new(& &1.acp_session_id)
      {:ok, Enum.reject(sessions, &MapSet.member?(known, &1[:session_id]))}
    end
  end

  @doc """
  Imports a session started outside console (`session/load` or `session/resume`) as a thread.
  """
  @spec import_thread(map, binary, User.t) :: thread_resp
  def import_thread(%{agent: agent, session_id: session_id} = attrs, instance_id, %User{id: user_id} = user) do
    start_transaction()
    |> add_operation(:instance, fn _ -> live_instance(instance_id) end)
    |> add_operation(:supported, fn %{instance: inst} -> supports(inst, agent, [:load, :resume], "import") end)
    |> add_operation(:thread, fn %{instance: inst} ->
      %DevboxInstanceSession{instance_id: inst.id, user_id: user_id, kind: :thread}
      |> DevboxInstanceSession.changeset(%{
        agent: agent,
        acp_session_id: session_id,
        title: attrs[:title],
        cwd: attrs[:cwd],
        imported: true,
        status: :active
      })
      |> allow(user, :create)
      |> when_ok(:insert)
    end)
    |> add_operation(:control, fn %{instance: inst, thread: thread} ->
      Control.import_thread(inst, thread)
      |> control_result(thread)
    end)
    |> execute(extract: :thread)
    |> notify(:update)
  end

  @doc """
  Resumes a closed thread (`session/resume`, or `session/load` on v1 agents).
  """
  @spec resume_thread(binary, User.t) :: thread_resp
  def resume_thread(id, %User{} = user) do
    thread_action(id, user, :prompt, [:resume, :load], "resume", fn inst, thread ->
      with {:ok, thread} <- Control.resume_thread(inst, thread) |> control_result(thread),
        do: update_thread(thread, %{status: :active})
    end)
  end

  @doc """
  Closes a thread (`session/close`), freeing its agent resources.  The transcript stays readable.
  """
  @spec close_thread(binary, User.t) :: thread_resp
  def close_thread(id, %User{} = user) do
    thread_action(id, user, :prompt, [:close], "close", fn inst, thread ->
      with {:ok, thread} <- Control.close_thread(inst, thread) |> control_result(thread),
        do: update_thread(thread, %{status: :closed, foreground_state: :idle})
    end)
  end

  @doc """
  Deletes a thread: its creator or workbench writers.  Agents without `session/delete` still lose the thread from
  console's index.
  """
  @spec delete_thread(binary, User.t) :: thread_resp
  def delete_thread(id, %User{} = user) do
    thread_action(id, user, :delete, [], "delete", fn inst, thread ->
      case Control.delete_thread(inst, thread) do
        {:error, :unsupported} -> update_thread(thread, %{status: :deleted})
        res ->
          with {:ok, thread} <- control_result(res, thread),
            do: update_thread(thread, %{status: :deleted})
      end
    end)
  end

  @doc """
  Forks a thread (`session/fork`) into a new one with the same agent and working directory.
  """
  @spec fork_thread(binary, map, User.t) :: thread_resp
  def fork_thread(id, attrs, %User{id: user_id} = user) do
    start_transaction()
    |> add_operation(:source, fn _ -> get_thread!(id) |> allow(user, :prompt) end)
    |> add_operation(:instance, fn %{source: src} -> live_instance(src.instance_id) end)
    |> add_operation(:supported, fn %{instance: inst, source: src} -> supports(inst, src.agent, [:fork], "fork") end)
    |> add_operation(:thread, fn %{source: src} ->
      %DevboxInstanceSession{instance_id: src.instance_id, user_id: user_id, kind: :thread}
      |> DevboxInstanceSession.changeset(%{
        agent: src.agent,
        cwd: src.cwd,
        worktree_repos: src.worktree_repos,
        user_title: attrs[:title] || "Fork of #{DevboxInstanceSession.display_title(src) || "thread"}",
        status: :active
      })
      |> Repo.insert()
    end)
    |> add_operation(:control, fn %{instance: inst, source: src, thread: thread} ->
      Control.fork_thread(inst, src, thread)
      |> Error.control_ok()
    end)
    |> add_operation(:session, fn %{thread: thread, control: result} -> attach_session(thread, result) end)
    |> execute(extract: :session)
    |> notify(:update)
  end

  @doc """
  Renames a thread.  The user's title wins over the agent's.
  """
  @spec rename_thread(binary, binary, User.t) :: thread_resp
  def rename_thread(id, title, %User{} = user) do
    get_thread!(id)
    |> allow(user, :prompt)
    |> when_ok(&update_thread(&1, %{user_title: title}))
    |> notify(:update)
  end

  @doc """
  Sends a prompt to a thread (`session/prompt`).  Gated on the workbench budget for AI-proxy billed agents.
  `attachments` are uploaded files; the daemon writes them into the box and links them from the prompt.
  """
  @spec send_prompt(binary, [map] | binary, User.t, [Plug.Upload.t] | nil) :: thread_resp
  def send_prompt(id, prompt, %User{} = user, uploads \\ []) do
    with {:ok, thread} <- allow(get_thread!(id), user, :prompt),
         {:ok, thread} <- active(thread),
         {:ok, attachments} <- attachments(uploads),
         {:ok, content} <- prompt_content(prompt, attachments),
         {:ok, inst} <- live_instance(thread.instance_id),
         {:ok, _} <- Billing.check(inst, thread.agent, user),
      do: Control.send_prompt(inst, thread, content, attachments) |> control_result(thread)
  end

  defp prompt_content(prompt, attachments) do
    content = Acp.prompt(prompt) |> Enum.reject(&match?(%{"type" => "text", "text" => t} when t in [nil, ""], &1))
    case {content, attachments} do
      {[], []} -> {:error, "a prompt needs text or an attachment"}
      _ -> {:ok, content}
    end
  end

  defp attachments(empty) when empty in [nil, []], do: {:ok, []}
  defp attachments(uploads) when length(uploads) > @max_attachments,
    do: {:error, "a prompt can have at most #{@max_attachments} attachments"}
  defp attachments(uploads) when is_list(uploads) do
    Enum.reduce_while(uploads, {:ok, [], 0}, fn
      %Plug.Upload{path: path} = upload, {:ok, acc, total} ->
        with {:ok, %File.Stat{size: size}} <- File.stat(path),
             total = total + size,
             :ok <- within_limit(total),
             {:ok, data} <- File.read(path) do
          {:cont, {:ok, [attachment(upload, data) | acc], total}}
        else
          {:error, msg} when is_binary(msg) -> {:halt, {:error, msg}}
          {:error, reason} -> {:halt, {:error, "could not read attachment #{upload.filename}: #{:file.format_error(reason)}"}}
        end
      _, _ -> {:halt, {:error, "attachments must be file uploads"}}
    end)
    |> case do
      {:ok, atts, _} -> {:ok, Enum.reverse(atts)}
      err -> err
    end
  end

  defp within_limit(total) when total > @max_attachment_bytes,
    do: {:error, "attachments can total at most #{div(@max_attachment_bytes, 1024 * 1024)} MB per prompt"}
  defp within_limit(_), do: :ok

  defp attachment(%Plug.Upload{filename: name, content_type: type}, data),
    do: %{name: name || "file", mime_type: mime_type(type, name), data: data}

  defp mime_type(type, _) when is_binary(type) and type not in ["", "application/octet-stream"], do: type
  defp mime_type(_, name) when is_binary(name), do: MIME.from_path(name)
  defp mime_type(_, _), do: "application/octet-stream"

  @doc """
  Cancels a thread's running prompt turn (`session/cancel`).
  """
  @spec cancel_prompt(binary, User.t) :: thread_resp
  def cancel_prompt(id, %User{} = user) do
    with {:ok, thread} <- allow(get_thread!(id), user, :prompt),
         {:ok, inst} <- live_instance(thread.instance_id),
      do: Control.cancel_prompt(inst, thread) |> control_result(thread)
  end

  @doc """
  Edits, drops or promotes (`:send_now`, which interrupts the running turn) a prompt held in a thread's queue.  The
  thread comes back with the queue as the box reports it; a prompt that already started is left alone.
  """
  @spec update_queued_prompt(binary, binary, :edit | :cancel | :send_now, binary | nil, User.t) :: thread_resp
  def update_queued_prompt(id, prompt_id, action, text, %User{} = user) do
    with {:ok, thread} <- allow(get_thread!(id), user, :prompt),
         :ok <- queued_text(action, text),
         {:ok, inst} <- live_instance(thread.instance_id) do
      case Control.update_queued_prompt(inst, thread, prompt_id, action, text) do
        {:ok, %{queued_prompts: queued}} -> store_queue(thread, queued)
        res -> control_result(res, thread)
      end
    end
  end

  defp queued_text(:edit, text) when is_binary(text) do
    case String.trim(text) do
      "" -> {:error, "a queued prompt needs text"}
      _ -> :ok
    end
  end
  defp queued_text(:edit, _), do: {:error, "a queued prompt needs text"}
  defp queued_text(_, _), do: :ok

  defp store_queue(thread, queued) when is_list(queued) do
    thread
    |> DevboxInstanceSession.changeset(%{queued_prompts: Enum.map(queued, &Ingest.queued_prompt/1)})
    |> Repo.update()
  end
  defp store_queue(thread, _), do: {:ok, thread}

  @doc """
  Sets a session config option (model, mode, thought level, ...), validated against the thread's current options
  as reported by the agent, or the box's catalog before the agent has reported any.
  """
  @spec set_config_option(binary, binary, binary, User.t) :: thread_resp
  def set_config_option(id, config_id, value, %User{} = user) do
    with {:ok, thread} <- allow(get_thread!(id), user, :prompt),
         {:ok, inst} <- live_instance(thread.instance_id),
         {:ok, opts} <- resolve_config_options(offered_config_options(thread, inst), [%{config_id: config_id, value: value}]),
         {:ok, _} <- Devboxes.check_autonomy(inst.devbox, opts),
         {:ok, _} <- Devboxes.check_proxy_auto(inst, thread.agent || inst.agent, opts),
      do: Control.set_config_option(inst, thread, config_id, value) |> control_result(thread)
  end

  # a proxy-billed agent's model picker offers the AI proxy's models, whatever the agent itself lists
  defp offered_config_options(%DevboxInstanceSession{} = thread, %DevboxInstance{} = inst) do
    agent = thread.agent || inst.agent
    opts = config_options(thread, inst)
    with false <- Billing.subscription?(inst, agent),
         %Devbox.Agent{} = box_agent <- Devbox.agent(inst.devbox, agent),
         [_ | _] = models <- Devboxes.offered_models(box_agent, :proxy) do
      Enum.map(opts, &with_proxy_models(&1, models))
    else
      _ -> opts
    end
  end

  defp with_proxy_models(%ConfigOption{category: "model", options: values} = opt, models) do
    known = MapSet.new(values || [], & &1.value)
    %{opt | options: (values || []) ++ for(m <- models, !MapSet.member?(known, m), do: %ConfigOption.Value{value: m})}
  end
  defp with_proxy_models(opt, _), do: opt

  defp config_options(%DevboxInstanceSession{config_options: [_ | _] = opts}, _), do: opts
  defp config_options(%DevboxInstanceSession{agent: agent}, %DevboxInstance{devbox: devbox}) do
    case Devbox.agent(devbox, agent) do
      %Devbox.Agent{config_options: opts} -> opts
      _ -> []
    end
  end

  @doc """
  The slash commands available in a thread.  Falls back to the last indexed list if the cluster is offline.
  """
  @spec list_commands(binary, User.t) :: {:ok, [map]} | error
  def list_commands(id, %User{} = user) do
    with {:ok, thread} <- allow(get_thread!(id), user, :read),
         {:ok, inst} <- live_instance(thread.instance_id) do
      case Control.list_commands(inst, thread) do
        {:ok, commands} -> {:ok, commands}
        {:error, reason} when reason in [:not_connected, :starting] -> {:ok, thread.available_commands || []}
        err -> Error.control(err)
      end
    end
  end

  @doc """
  Answers a pending interaction (a permission request or elicitation).  The answer is recorded optimistically; the
  daemon's next index revision is authoritative.
  """
  @spec respond(binary, map, User.t) :: {:ok, DevboxInstanceInteraction.t} | error
  def respond(id, response, %User{id: user_id} = user) do
    start_transaction()
    |> add_operation(:interaction, fn _ ->
      get_interaction!(id)
      |> allow(user, :respond)
    end)
    |> add_operation(:pending, fn %{interaction: interaction} -> pending(interaction) end)
    |> add_operation(:response, fn %{interaction: interaction} -> validate_response(interaction, response) end)
    |> add_operation(:instance, fn %{interaction: interaction} -> live_instance(interaction.instance_id) end)
    |> add_operation(:control, fn %{instance: inst, interaction: interaction, response: response} ->
      Control.respond(inst, interaction, Map.put(response, :principal, principal(user)))
      |> control_result(interaction)
    end)
    |> add_operation(:update, fn %{interaction: interaction, response: response} ->
      interaction
      |> DevboxInstanceInteraction.changeset(%{
        state: :answered,
        response: response,
        answered_by_id: user_id,
        answered_at: DateTime.utc_now()
      })
      |> Repo.update()
    end)
    |> execute(extract: :update)
    |> notify(:update)
  end

  defp pending(%DevboxInstanceInteraction{state: :pending} = i), do: {:ok, i}
  defp pending(%DevboxInstanceInteraction{state: state}), do: {:error, "this request was already #{state}"}

  defp validate_response(%DevboxInstanceInteraction{kind: :permission, options: opts}, %{option_id: id} = resp) do
    case Enum.any?(opts || [], & &1.option_id == id) do
      true -> {:ok, Map.take(resp, [:option_id])}
      false -> {:error, "#{id} is not one of the offered options"}
    end
  end
  defp validate_response(%DevboxInstanceInteraction{kind: :permission}, %{cancelled: true}), do: {:ok, %{cancelled: true}}
  defp validate_response(%DevboxInstanceInteraction{kind: kind}, %{action: action} = resp)
    when kind in ~w(form_elicitation url_elicitation)a and action in ~w(accept decline cancel)a do
    {:ok, %{action: Atom.to_string(action), content: resp[:content]} |> Map.reject(fn {_, v} -> is_nil(v) end)}
  end
  defp validate_response(%DevboxInstanceInteraction{kind: kind}, _),
    do: {:error, "invalid response for a #{kind} request"}

  @doc """
  Adds a repository to a running instance's workspace, if the box's allowlist permits it.
  """
  @spec add_repository(binary, binary, User.t) :: {:ok, DevboxInstance.t} | error
  def add_repository(instance_id, repository, %User{} = user) do
    with {:ok, inst} <- allow(Devboxes.get_instance!(instance_id), user, :prompt),
         {:ok, inst} <- live_instance(inst.id),
         true <- Devbox.allowed_repository?(inst.devbox, repository) || {:error, "repository #{repository} is not allowed on this devbox"},
         {:ok, inst} <- Control.add_repository(inst, repository) |> control_result(inst) do
      inst
      |> DevboxInstance.changeset(%{repositories: Enum.uniq((inst.repositories || []) ++ [repository])})
      |> Repo.update()
      |> Devboxes.notify(:update)
    end
  end

  @doc """
  The checkouts in an instance's workspace, live if the cluster is reachable, otherwise from the last index.
  """
  @spec list_repositories(binary, User.t) :: {:ok, [map]} | error
  def list_repositories(instance_id, %User{} = user) do
    with {:ok, inst} <- read_instance(instance_id, user) do
      case Control.list_repositories(inst) do
        {:ok, repos} -> {:ok, repos}
        {:error, reason} when reason in [:not_connected, :starting] -> {:ok, Enum.map(inst.checkouts || [], &Map.from_struct/1)}
        err -> Error.control(err)
      end
    end
  end

  @doc """
  A page of a session's transcript, served by the box (resuming it when suspended): settled entities merged with
  in-flight state, in position order.  Without a cursor it's the newest page; `:before` pages backwards and
  `:after` forwards, with `has_more` saying more entities lie in that direction.  Apply live deltas with an offset
  above `delta_offset` on top.
  """
  @spec timeline(binary, binary, map, User.t) :: {:ok, map} | error
  def timeline(_, _, %{before: b, after: a}, _) when is_integer(b) and is_integer(a),
    do: {:error, "pass either before or after, not both"}
  def timeline(instance_id, session_id, opts, %User{} = user) do
    with {:ok, inst} <- read_instance(instance_id, user),
         {:ok, page} <- Control.get_timeline(inst, session_id, opts) |> Error.control_ok(),
      do: {:ok, Acp.timeline(page)}
  end

  @doc """
  The live thread and subagent tree, falling back to the index when the box is suspended or its cluster offline.
  """
  @spec sessions(binary, User.t) :: {:ok, [map]} | error
  def sessions(instance_id, %User{} = user) do
    with {:ok, inst} <- read_instance(instance_id, user) do
      case Control.get_sessions(inst) do
        {:ok, sessions} -> {:ok, sessions}
        {:error, reason} when reason in [:not_connected, :suspended, :starting] ->
          {:ok, DevboxInstanceSession.for_instance(inst.id) |> DevboxInstanceSession.visible() |> Repo.all()}
        err -> Error.control(err)
      end
    end
  end

  defp thread_action(id, user, action, ops, name, fun) do
    start_transaction()
    |> add_operation(:thread, fn _ -> get_thread!(id) |> allow(user, action) end)
    |> add_operation(:instance, fn %{thread: thread} -> live_instance(thread.instance_id) end)
    |> add_operation(:supported, fn %{instance: inst, thread: thread} -> supports(inst, thread.agent, ops, name) end)
    |> add_operation(:result, fn %{instance: inst, thread: thread} -> fun.(inst, thread) end)
    |> execute(extract: :result)
    |> notify(:update)
  end

  defp supports(_, _, [], _), do: {:ok, true}
  defp supports(%DevboxInstance{devbox: devbox}, agent, ops, name) do
    with %Devbox.Agent{} = agent <- Devbox.agent(devbox, agent),
         true <- Enum.any?(ops, &Devbox.Agent.supports?(agent, &1)) do
      {:ok, true}
    else
      _ -> Error.unsupported("the #{agent} agent doesn't support #{name} for threads")
    end
  end

  defp live_instance(id) do
    Devboxes.get_instance!(id)
    |> Repo.preload([:devbox, :workbench])
    |> ensure_live()
  end

  defp read_instance(id, user) do
    Devboxes.get_instance!(id)
    |> Repo.preload([:devbox])
    |> allow(user, :read)
  end

  defp active(%DevboxInstanceSession{status: status} = thread) when status in ~w(active waiting)a, do: {:ok, thread}
  defp active(%DevboxInstanceSession{status: status}), do: {:error, "thread is #{status}, resume it first"}

  defp update_thread(thread, attrs) do
    thread
    |> DevboxInstanceSession.changeset(attrs)
    |> Repo.update()
  end

  defp principal(%User{id: id, email: email, name: name}), do: %{user_id: id, email: email, name: name}

  def notify({:ok, %DevboxInstanceSession{} = thread}, :update),
    do: handle_notify(PubSub.DevboxThreadUpdated, thread)
  def notify({:ok, %DevboxInstanceInteraction{} = interaction}, :update) do
    Console.Devboxes.Ingest.publish_index(interaction.instance_id, %{interactions: [interaction]})
    {:ok, interaction}
  end
  def notify(pass, _), do: pass
end
