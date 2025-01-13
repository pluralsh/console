defmodule Console.Plural.Socket do
  use Slipstream


  def start_link(args) do
    Slipstream.start_link(__MODULE__, args, name: __MODULE__)
  end

  @impl Slipstream
  def init(config) do
    with {:ok, socket} <- connect(config),
      do: {:ok, assign(socket, :replies, %{})}
  end

  def do_join(pid \\ __MODULE__, channel), do: GenServer.call(pid, {:join, channel})

  def do_push(pid \\ __MODULE__, channel, msg, args), do: GenServer.call(pid, {:push, channel, msg, args})

  @impl Slipstream
  def handle_call({:join, channel}, _, socket) do
    {:reply, :ok, join(socket, channel)}
  end

  def handle_call({:push, channel, msg, args}, from, socket) do
    case push(socket, channel, msg, args) do
      {:ok, ref} -> {:noreply, assign(socket, :replies, Map.put(socket.assigns.replies, ref, from))}
      err -> {:reply, err, socket}
    end
  end

  @impl Slipstream
  def handle_continue(:start_ping, socket) do
    timer = :timer.send_interval(1000, self(), :request_metrics)

    {:noreply, assign(socket, :ping_timer, timer)}
  end

  @impl Slipstream
  def handle_connect(socket) do
    {:ok, socket}
  end

  @impl Slipstream
  def handle_join(_, _join_response, socket) do
    {:ok, socket}
  end

  @impl Slipstream
  def handle_reply(ref, reply, %Slipstream.Socket{assigns: %{replies: replies}} = socket) do
    case replies do
      %{^ref => from} ->
        GenServer.reply(from, {:ok, reply})
        {:ok, assign(socket, :replies, Map.delete(replies, ref))}
      _ -> {:ok, socket}
    end
  end
  def handle_reply(_, _, socket), do: {:ok, socket}

  @impl Slipstream
  def handle_message(_, _, _, socket) do
    {:ok, socket}
  end

  @impl Slipstream
  def handle_disconnect(_reason, state) do
    case reconnect(state.socket) do
      {:ok, socket} -> {:ok, %{state | socket: socket}}
      {:error, reason} -> {:stop, reason, state}
    end
  end
end
