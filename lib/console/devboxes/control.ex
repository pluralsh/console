defmodule Console.Devboxes.Control do
  @moduledoc """
  Every devbox call that has to reach a cluster goes through this behaviour, which mirrors the `devbox.v1.Control`
  RPCs console makes to KAS (which forwards them to the owning cluster's `devbox-gateway`).

  The implementation is chosen with `config :console, :devbox_control, Module`: `Console.Devboxes.Control.Grpc` in
  deployed environments, `Console.Devboxes.Control.Test` in tests.  `Console.Devboxes.Control.Disconnected` fails
  every call with `{:error, :not_connected}`.
  """
  alias Console.Schema.{DevboxInstance, DevboxInstanceSession, DevboxInstanceInteraction, DevboxSnapshot}

  @type instance :: DevboxInstance.t
  @type thread :: DevboxInstanceSession.t
  @type result :: :ok | {:ok, term} | {:error, term}

  @doc "Creates the instance's actor, from the box's golden template or `opts.snapshot`, and boots it"
  @callback create_instance(instance, opts :: map) :: result
  @doc "Stops the instance and deletes its actor and egress policy"
  @callback cancel_instance(instance) :: result
  @callback suspend_instance(instance) :: result
  @callback resume_instance(instance) :: result
  @doc "Suspends with synchronous durability, tags the actor as `snapshot`, and resumes it"
  @callback snapshot_instance(instance, DevboxSnapshot.t) :: result
  @callback delete_snapshot(DevboxSnapshot.t) :: result
  @doc """
  Moves the instance to its box's current template revision: a running instance is suspended, moved and cold-booted
  (processes and root filesystem changes are lost, the home volume and threads are kept), a suspended one is moved
  and cold-boots at its next resume.  Resolves to `{:ok, %{accepted: boolean}}`; the outcome arrives with the
  instance's status.  `opts`: `reason`, `principal`.
  """
  @callback rebase_instance(instance, opts :: map) :: result
  @doc "Restarts one agent connection with new billing (`launch` is a normalized `Console.Devboxes.Billing` launch)"
  @callback set_agent_billing(instance, launch :: map) :: result
  @doc "Installs a refreshed subscription credential bundle on a running instance"
  @callback push_credential(instance, credential :: map) :: result

  @doc "`session/new`; resolves to `{:ok, %{session_id: binary}}`"
  @callback create_thread(instance, thread, opts :: map) :: result
  @doc "The agents' own `session/list`; resolves to `{:ok, [%{agent, session_id, title, cwd, updated_at}]}`"
  @callback list_sessions(instance) :: result
  @callback import_thread(instance, thread) :: result
  @callback resume_thread(instance, thread) :: result
  @callback close_thread(instance, thread) :: result
  @callback delete_thread(instance, thread) :: result
  @doc "`session/fork`; resolves to `{:ok, %{session_id: binary}}`"
  @callback fork_thread(instance, source :: thread, target :: thread) :: result
  @doc "`session/prompt`; `attachments` are `%{name, mime_type, data}` files the daemon writes into the box"
  @callback send_prompt(instance, thread, prompt :: [map], attachments :: [map]) :: result
  @callback cancel_prompt(instance, thread) :: result
  @doc "Edits (`:edit`, with `text`), drops (`:cancel`) or promotes (`:send_now`) a held prompt; resolves to `{:ok, %{updated, queued_prompts}}`"
  @callback update_queued_prompt(instance, thread, prompt_id :: binary, action :: :edit | :cancel | :send_now, text :: binary | nil) :: result
  @callback set_config_option(instance, thread, config_id :: binary, value :: binary) :: result
  @callback respond(instance, DevboxInstanceInteraction.t, response :: map) :: result
  @doc "Live slash commands for a running thread; resolves to `{:ok, [%{name, description, input_hint}]}`"
  @callback list_commands(instance, thread) :: result

  @doc "The box's transcript merged with in-flight state, resuming a suspended box.  `opts` take one of `:before` (page backwards) or `:after` (page forwards); neither is the newest page.  Resolves to `{:ok, %{entities: [map], delta_offset: integer, has_more: boolean}}`"
  @callback get_timeline(instance, session_id :: binary, opts :: map) :: result
  @doc "The thread and subagent tree; resolves to `{:ok, [map]}`"
  @callback get_sessions(instance) :: result

  @doc "Viewer and deferral leases, as absolute expiry times"
  @callback set_instance_leases(instance, leases :: map) :: result
  @callback add_repository(instance, repository :: binary) :: result
  @doc "Checkouts in the workspace; resolves to `{:ok, [%{path, remote, branch, sha}]}`"
  @callback list_repositories(instance) :: result
  @doc """
  One directory level, or with `opts.query` the best fuzzy matches anywhere beneath it (`opts.brief` drops all but
  path, name, type and repository, for a listing from memory); resolves to
  `{:ok, [%{path, name, type, size, modified_at, repository, git_status}]}`
  """
  @callback list_files(instance, path :: binary, opts :: map) :: result
  @doc "Resolves to `{:ok, %{entry, content, sha256, truncated, mime_type, binary}}`"
  @callback read_file(instance, path :: binary, opts :: map) :: result
  @doc "Writes a file, compare-and-swap on `opts.expected_sha256`; resolves to `{:ok, %{entry, sha256}}`"
  @callback write_file(instance, path :: binary, content :: binary, opts :: map) :: result
  @doc "Uncommitted changes per checkout; resolves to `{:ok, [%{checkout, base_ref, base_sha, files, additions, deletions}]}`"
  @callback get_changes(instance, opts :: map) :: result
  @doc """
  Writes, commits and pushes a checkout's changes for a pull request in the box, which can take minutes; resolves to
  `{:ok, %{remote_url, checkout_path, head_branch, base_branch, title, body, base_sha, head_sha, additions, deletions,
  committed, writer}}`.  `opts`: `repository` (a checkout name or path), and `model` (an AI proxy model) or `agent`
  (a subscription agent whose CLI writes the text), plus an optional `thread_id` for context.
  """
  @callback prepare_pull_request(instance, opts :: map) :: result
  @doc """
  Opens a terminal, vnc or preview stream on the daemon; resolves to
  `{:ok, %{stream_id, kind, daemon_path, expires_at, subprotocols, terminal}}`.  Console mints the stream token.
  """
  @callback open_stream(instance, kind :: atom, opts :: map) :: result

  @callbacks [
    create_instance: 2,
    cancel_instance: 1,
    suspend_instance: 1,
    resume_instance: 1,
    snapshot_instance: 2,
    delete_snapshot: 1,
    rebase_instance: 2,
    set_agent_billing: 2,
    push_credential: 2,
    create_thread: 3,
    list_sessions: 1,
    import_thread: 2,
    resume_thread: 2,
    close_thread: 2,
    delete_thread: 2,
    fork_thread: 3,
    send_prompt: 4,
    cancel_prompt: 2,
    update_queued_prompt: 5,
    set_config_option: 4,
    respond: 3,
    list_commands: 2,
    get_timeline: 3,
    get_sessions: 1,
    set_instance_leases: 2,
    add_repository: 2,
    list_repositories: 1,
    list_files: 3,
    read_file: 3,
    write_file: 4,
    get_changes: 2,
    prepare_pull_request: 2,
    open_stream: 3
  ]

  def callbacks(), do: @callbacks

  def impl(), do: Console.conf(:devbox_control, Console.Devboxes.Control.Disconnected)

  for {name, arity} <- @callbacks do
    args = Macro.generate_arguments(arity, __MODULE__)
    def unquote(name)(unquote_splicing(args)), do: impl().unquote(name)(unquote_splicing(args))
  end
end
