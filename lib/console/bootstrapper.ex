defmodule Console.Bootstrapper do
  use GenServer
  require Logger
  alias Console.Schema.GitRepository
  alias Console.Deployments.Git.Discovery

  defmodule State, do: defstruct [:output, :cloned]

  def start_link(opts \\ :ok) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_) do
    Process.flag(:trap_exit, true)
    if Console.conf(:initialize) do
      :timer.send_interval(:timer.minutes(30), :migrate)
      send self(), :migrate
      send self(), :kick_git
    end

    write_token_file!()
    {:ok, %State{}}
  end

  def kick(), do: GenServer.cast(__MODULE__, :start)

  def git_enabled?(), do: !Console.conf(:initialize)

  def status(), do: %{cloned: false, output: ""}

  def handle_info(:migrate, state) do
    with {:error, err} <- Console.Deployments.Settings.migrate_agents(),
      do: Logger.info("didn't migrate agents due to: #{inspect(err)}")
    {:noreply, state}
  end

  def handle_info(:kick, state) do
    Console.Repo.all(GitRepository)
    |> Enum.each(&Discovery.start/1)
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}

  defp write_token_file!() do
    Path.join(Console.conf(:sidecar_token_path), "token")
    |> File.write!(Console.conf(:sidecar_token))
  end
end
