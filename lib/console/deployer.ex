defmodule Console.Deployer do
  use GenServer
  alias Console.Commands.{Plural, Command}
  alias Console.Services.{Builds, Users, LeaderElection}
  alias Console.Schema.Build
  alias Console.Plural.Context
  require Logger

  @poll_interval 10_000
  @group :deployer
  @leader "deployer"

  defmodule State, do: defstruct [:storage, :ref, :pid, :build, :id, :timer, :leader]

  def start(storage) do
    GenServer.start(__MODULE__, storage)
  end

  def start_link(_opts \\ :ok) do
    GenServer.start_link(__MODULE__, Console.storage(), name: __MODULE__)
  end

  def init(storage) do
    Process.flag(:trap_exit, true)
    Logger.info "Starting deployer"
    :pg2.create(@group)
    :pg2.join(@group, self())
    {:ok, _} = :timer.send_interval(@poll_interval, :poll)
    send self(), :init
    if Console.conf(:initialize) do
      :timer.send_interval(:timer.minutes(2), :sync)
    end
    {:ok, %State{storage: storage, id: Ecto.UUID.generate()}}
  end

  def me(), do: {__MODULE__, node()}

  def elect() do
    Logger.info "attempting to elect #{inspect(me())} as leader"
    LeaderElection.elect(me(), @leader)
  end

  def leader() do
    case LeaderElection.get(@leader) do
      %{ref: ref} -> ref
      _ -> __MODULE__
    end
  end

  def file(path), do: GenServer.call(leader(), {:file, path})

  def wake(), do: GenServer.call(leader(), :poll)

  def cancel(), do: GenServer.call(leader(), :cancel)

  def state(), do: GenServer.call(leader(), :state)

  def ping(), do: GenServer.call(leader(), :ping)

  def update(repo, content, tool, msg \\ nil), do: GenServer.call(leader(), {:update, repo, content, tool, msg})

  def exec(fun), do: GenServer.call(leader(), {:exec, fun})

  def handle_call({:file, path}, _, state) do
    {:reply, File.read(path), state}
  end

  def handle_call(:poll, _, %State{} = state) do
    send(self(), :poll)
    {:reply, :ok, state}
  end

  def handle_call({:update, repo, content, tool, msg}, _, %State{storage: storage} = state) do
    {:reply, update(storage, repo, content, tool, msg), state}
  end

  def handle_call({:exec, fun}, _, state) when is_function(fun) do
    res = fun.(state.storage)
    broadcast()
    {:reply, res, state}
  end

  def handle_call(:ping, _, state), do: {:reply, :pong, state}

  def handle_call(:cancel, _, state) do
    Logger.info "Attempting to cancel build"
    with %{id: id} <- Builds.get_running(),
      do: GenServer.stop({:via, :swarm, id}, {:shutdown, :cancel})
    {:reply, :ok, state}
  end

  def handle_call(:state, _, state), do: {:reply, state, state}

  def handle_cast(:sync, %State{ref: nil, storage: storage} = state) do
    Logger.info "Resyncing git state"
    storage.init()
    storage.doctor()
    {:noreply, state}
  end
  def handle_cast(:sync, state), do: {:noreply, state}

  def handle_info(:sync, state), do: handle_cast(:sync, state)

  def handle_info(:init, %State{} = state) do
    {:noreply, state}
  end

  def handle_info(:poll, %State{pid: nil, storage: storage, id: id} = state) do
    Logger.info "Checking for pending builds, pid: #{inspect(self())}, node: #{node()}"
    with {:ok, _} <- elect(),
         {:ok, %Build{} = build} <- Builds.poll(id) do
      {pid, ref} = perform(storage, build)
      {:noreply, %{state | ref: ref, pid: pid, build: build}}
    else
      {:error, :locked} ->
        Logger.info "deployer is locked"
        {:noreply, state}
      {:error, :following} ->
        Logger.info "#{node()} is a follower"
        {:noreply, state}
      _ ->
        Logger.info "No build found"
        {:noreply, state}
    end
  end

  def handle_info(:poll, %State{pid: pid} = state) when is_pid(pid) do
    Logger.info "Build #{inspect(pid)} already running"
    elect()
    {:noreply, ping(state)}
  end

  def handle_info({:DOWN, ref, :process, _, _}, %State{ref: ref, build: build} = state) do
    Logger.info "tearing down build #{build.id}, proc: #{inspect(state.pid)}"
    Builds.cancel(build)
    broadcast()
    send(self(), :poll)
    {:noreply, %{state | ref: nil, pid: nil, build: nil}}
  end

  def handle_info(_, state), do: {:noreply, state}

  def terminate(state, reason) do
    Logger.info "Terminating with state: #{inspect(state)} reason #{inspect(reason)}"
    case LeaderElection.clear(me(), @leader) do
      {:ok, _} -> Logger.info "removed #{inspect(me())} as cluster leader"
      _ -> Logger.info "#{inspect(me())} is not leader, moving on"
    end
    :ok
  end

  defp perform(storage, %Build{repository: repo, type: :bounce} = build) do
    with_build(build, [{storage, :init, []}, {Plural, :bounce, [repo]}], storage)
  end

  defp perform(storage, %Build{type: :deploy, repository: repo, message: message} = build) do
    with_build(build, [
      {storage, :init, []},
      {Plural, :build, [repo]},
      {Plural, :diff, [repo]},
      {Plural, :deploy, [repo]},
      {storage, :revise, [commit_message(message, repo)]},
      {storage, :push, []}
    ], storage)
  end

  defp perform(storage, %Build{type: :destroy, repository: repo} = build) do
    with_build(build, [
      {storage, :init, []},
      {Plural, :destroy, [repo]},
      {storage, :revise, ["destroyed application #{repo}"]},
      {storage, :push, []}
    ], storage)
  end

  defp perform(storage, %Build{type: :install, context: %{"configuration" => conf, "bundle" => b}, message: message} = build) do
    with_build(build, [
      {storage, :init, []},
      {Context, :merge, [conf, %Context.Bundle{repository: b["repository"], name: b["name"]}]},
      {Plural, :build, []},
      {Plural, :install, [b["repository"]]},
      {storage, :revise, [commit_message(message, b["repository"])]},
      {storage, :push, []}
    ], storage)
  end

  defp perform(storage, %Build{type: :install, context: %{"configuration" => conf, "bundles" => bs}, message: message} = build) do
    with_build(build, [
      {storage, :init, []},
      {Context, :merge, [conf, Enum.map(bs, fn b -> %Context.Bundle{repository: b["repository"], name: b["name"]} end)]},
      {Plural, :build, []},
      {Plural, :install, [Enum.map(bs, & &1["repository"])]},
      {storage, :revise, [message]},
      {storage, :push, []}
    ], storage)
  end

  defp perform(storage, %Build{type: :approval, repository: repo, message: message} = build) do
    with_build(build, [
      {storage, :init, []},
      {Plural, :build, [repo]},
      {Plural, :diff, [repo]},
      :approval,
      {Plural, :deploy, [repo]},
      {storage, :revise, [commit_message(message, repo)]},
      {storage, :push, []}
    ], storage)
  end

  defp update(storage, repo, content, tool, msg) do
    Command.set_build(nil)
    bot = Users.get_bot!("console")
    with {:ok, _} <- storage.init(),
         {:ok, res} <- Console.Services.Plural.update_configuration(repo, content, tool),
         {:ok, _} <- storage.revise(msg || "updated configuration for #{tool} #{repo}"),
         {:ok, _} <- storage.push(),
         {:ok, _} <- Builds.create(%{
          type: :deploy,
          repository: repo,
          message: "redeploying after #{tool} update for #{repo}",
        }, bot),
         _ <- broadcast(),
      do: {:ok, res}
  end

  defp with_build(%Build{} = build, operations, storage) do
    {:ok, pid} = Console.Runner.start_link(build, operations, storage)
    Swarm.register_name(build.id, pid)
    Console.Runner.register(pid)
    ref = Process.monitor(pid)
    {pid, ref}
  end

  defp ping(%State{build: %Build{} = build} = state) do
    case Builds.ping(build) do
      {:ok, build} -> %{state | build: build}
      _ -> state
    end
  end
  defp ping(state), do: state

  def broadcast(msg \\ :sync) do
    :pg2.get_members(@group)
    |> Enum.filter(& &1 != self())
    |> Enum.each(&GenServer.cast(&1, msg))
  end

  defp commit_message(nil, repo), do: "console deployment for #{repo}"
  defp commit_message(message, repo), do: "console deployment for #{repo} -- #{message}"
end
