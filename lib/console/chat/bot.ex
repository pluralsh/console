defmodule Console.Chat.Bot do
  @moduledoc """
  A bot for the console chat.
  """
  use GenServer, restart: :temporary
  alias Console.Schema.ChatConnection
  alias Console.Chat.{Impl, Registrar}

  defmodule State do
    defstruct [:pid, :conn]
  end

  @spec start_link(ChatConnection.t()) :: GenServer.on_start()
  def start_link(conn) do
    GenServer.start_link(__MODULE__, conn, name: {:via, Registry, {Console.AI.Agents, {:chatbot, conn.id}}})
  end

  def init(conn) do
    with {mod, fun, args} <- Impl.child_spec(conn),
         {:ok, pid} = apply(mod, fun, args) do
      :timer.send_interval(:timer.minutes(1), self(), :ping)
      {:ok, %State{pid: pid, conn: conn}}
    else
      err -> {:stop, {:init_failure, err}}
    end
  end

  def handle_info(:ping, %State{conn: conn} = state) do
    case Registrar.local?(conn) do
      true -> {:noreply, state}
      false -> {:stop, :normal, state}
    end
  end
  def handle_info(_, state), do: {:noreply, state}

  def terminate(_, _), do: :ok
end
