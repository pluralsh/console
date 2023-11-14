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

    {:ok, fetch_state({%Features{}, nil})}
  end

  def available?(feature) do
    case fetch() do
      %{^feature => true} -> true
      _ -> false
    end
  end

  def fetch(), do: GenServer.call(__MODULE__, :fetch)

  def account(), do: GenServer.call(__MODULE__, :account)

  def handle_call(:fetch, _, {feats, _} = state), do: {:reply, feats, state}

  def handle_call(:account, _, {_, account} = state), do: {:reply, account, state}

  def handle_info(:poll, state), do: {:noreply, fetch_state(state)}

  defp fetch_state(state) do
    case Accounts.account() do
      {:ok, %Account{availableFeatures: %Features{} = feats} = account} -> {feats, account}
      _ -> state
    end
  end
end
