defmodule Console.Deployments.Git.Kick do
  use GenServer
  alias Console.Deployments.Git.Discovery
  alias Console.Schema.GitRepository

  @poll :timer.seconds(60)

  def start_link(opts \\ :ok) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(_) do
    if Console.conf(:initialize) do
      :timer.send_interval(@poll, :kick)
    end
    {:ok, %{}}
  end

  def handle_info(:kick, state) do
    Console.Repo.all(GitRepository)
    |> Enum.each(&Discovery.start/1)
    {:noreply, state}
  end
end
