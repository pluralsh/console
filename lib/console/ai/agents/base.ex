defmodule Console.AI.Agents.Base do
  defmacro __using__(_) do
    quote do
      use GenServer
      alias Console.Schema.AgentSession

      def registry(), do: Console.AI.Agents

      defp via(%AgentSession{id: id}), do: {:via, Registry, {registry(), {:agent, id}}}

      def start_link([%AgentSession{} = session]), do: start_link(session)
      def start_link(%AgentSession{} = session) do
        GenServer.start_link(__MODULE__, session, name: via(session))
      end

      def init(session) do
        Process.send_after(self(), :die, :timer.minutes(15))
        {:ok, session, {:continue, :boot}}
      end

      def boot(_pid), do: :ok

      def enqueue(pid, task), do: GenServer.cast(pid, {:enqueue, task})

      def handle_info(:die, session) do
        {:stop, :normal, session}
      end
      def handle_info(_, session), do: {:noreply, session}
    end
  end
end
