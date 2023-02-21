defmodule Console.Features do
  use GenServer
  alias Console.Plural.{Accounts, Account, Features}

  def start_link(_opts \\ :ok) do
    GenServer.start_link(__MODULE__, :ok, name: __MODULE__)
  end

  def start() do
    GenServer.start_link(__MODULE__, :ok)
  end

  def init(_) do
    if Console.conf(:initialize) do
      :timer.send_interval(:timer.seconds(60), :poll)
      send self(), :poll
    end

    {:ok, %Features{}}
  end

  def available?(feature) do
    case fetch() do
      %{^feature => true} -> true
      _ -> false
    end
  end

  def fetch(), do: GenServer.call(__MODULE__, :fetch)

  def handle_call(:fetch, _, state), do: {:reply, state, state}

  def handle_info(:poll, state) do
    case Accounts.account() do
      {:ok, %Account{availableFeatures: %Features{} = feats}} -> {:noreply, feats}
      _ -> {:noreply, state}
    end
  end
end
