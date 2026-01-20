defmodule Console.Chat.Registrar do
  use GenServer
  alias Console.Schema.ChatConnection
  alias Console.Repo
  alias Console.Chat.DynamicSupervisor
  require Logger

  @poll :timer.minutes(5)

  def start_link(arg \\ :ok) do
    GenServer.start_link(__MODULE__, arg, name: __MODULE__)
  end

  def init(_arg) do
    if Console.conf(:initialize) do
      :timer.send_interval(@poll, :poll)
      send self(), :poll
    end

    {:ok, %{}}
  end

  def handle_info(:poll, state) do
    Logger.info "polling for chat connections to start"
    chats = Repo.all(ChatConnection)

    Map.merge(state, start_chats(chats))
    |> prune_chats(chats)
    |> then(& {:noreply, &1})
  end
  def handle_info(_, state), do: {:noreply, state}

  defp local?(%ChatConnection{id: id}), do: Console.ClusterRing.node(id) == node()

  defp start_chats(chats) do
    chats
    |> Enum.filter(&local?/1)
    |> Enum.reduce(%{}, fn chat, acc ->
      case DynamicSupervisor.start_child(chat) do
        {:ok, pid} -> Map.put(acc, chat.id, pid)
        {:error, {:already_started, pid}} -> Map.put(acc, chat.id, pid)
        err ->
          Logger.warning "failed to start chat #{chat.id}: #{inspect(err)}"
          acc
      end
    end)
  end

  defp prune_chats(lookup, chats) do
    lookup
    |> Map.drop(Enum.map(chats, & &1.id))
    |> Enum.map(fn {id, pid} ->
      Process.exit(pid, :shutdown)
      id
    end)
    |> then(&Map.drop(lookup, &1))
  end
end
