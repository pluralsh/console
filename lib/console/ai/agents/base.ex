defmodule Console.AI.Agents.Base do
  use Console.Services.Base
  alias Console.AI.Chat, as: ChatSvc
  alias Console.Schema.{ChatThread, Chat, AgentSession}
  alias Console.Repo
  alias Console.AI.Chat.Engine
  alias Console.AI.Stream
  require Logger

  defmacro __using__(_) do
    quote do
      use GenServer, restart: :transient
      import Console.AI.Agents.Base
      alias Console.Schema.AgentSession
      alias Console.AI.Stream
      require Logger

      def registry(), do: Console.AI.Agents

      defp via(%AgentSession{id: id}), do: {:via, Registry, {registry(), {:agent, id}}}

      def start_link([%AgentSession{} = session]), do: start_link(session)
      def start_link(%AgentSession{} = session) do
        GenServer.start_link(__MODULE__, session, name: via(session))
      end

      def init(session) do
        Logger.info("Starting agent session #{session.id}")
        Process.send_after(self(), :die, :timer.minutes(15))
        :timer.send_interval(:timer.minutes(1), self(), {:move, session})
        {:ok, refetch(session), {:continue, :boot}}
      end

      def handle_continue(:boot, %AgentSession{initialized: false} = session) do
        Logger.info("Booting agent session #{session.id}")
        {thread, session} = setup_context(session)

        Stream.topic(:thread, thread.id, thread.user)
        |> Stream.enable()

        {:ok, thread, session} = drive(thread, [user_message(session.prompt)], thread.user)
        {:ok, session} = initialized(session)
        update_context(%{session: session})
        enqueue(self(),:booted)
        Logger.info("Booted agent session #{session.id}")
        {:noreply, {thread, session}}
      end

      def handle_continue(:boot, %AgentSession{} = session) do
        Logger.info("restarting agent session #{session.id}")
        {thread, session} = setup_context(session)

        Stream.topic(:thread, thread.id, thread.user)
        |> Stream.enable()

        {:noreply, {thread, session}}
      end

      def boot(_pid), do: :ok

      def enqueue(pid, task), do: GenServer.cast(pid, {:enqueue, task})

      def handle_info({:move, session}, state) do
        case Console.AI.Agents.Discovery.local?(session) do
          true -> {:noreply, state}
          false -> {:stop, :moved, state}
        end
      end

      def handle_info(:die, {_, session} = state) do
        done(session)
        {:stop, :normal, state}
      end

      def handle_info(_, session), do: {:noreply, session}
    end
  end

  def handle_result({:ok, thread, session}, _, _), do: {:noreply, {thread, session}}
  def handle_result(err, thread, session) do
    Logger.info "agent thread failure: #{inspect(err)}"
    {:noreply, {thread, session}}
  end

  def refetch(%AgentSession{id: id}), do: Console.Repo.get!(AgentSession, id)

  def drive(thread, messages \\ [], user) do
    done(thread.session, false)
    Enum.reduce_while(0..3, :ok, fn val, _ ->
      if val > 0 do
        Logger.info "retrying agent thread #{thread.id} #{val} times"
        :timer.sleep(:timer.seconds(1))
      end

      start_transaction()
      |> add_operation(:save, fn _ -> ChatSvc.save(format(messages), thread.id, thread.user) end)
      |> add_operation(:chat, fn _ ->
        Chat.for_thread(thread.id)
        |> Chat.ordered()
        |> Repo.all()
        |> ChatSvc.fit_context_window()
        |> Enum.map(&Chat.message/1)
        |> Enum.filter(& &1)
        |> Engine.completion(thread, user)
      end)
      |> add_operation(:bump, fn _ ->
        ChatThread.changeset(thread, %{last_message_at: Timex.now()})
        |> Repo.update()
      end)
      |> add_operation(:init, fn %{bump: %{session: session}} ->
        AgentSession.changeset(session, %{initialized: true})
        |> Repo.update()
      end)
      |> execute(timeout: 300_000)
      |> case do
        {:ok, %{bump: thread, init: session}} ->
          done(session)
          {:halt, {:ok, thread, session}}
        err -> {:cont, err}
      end
    end)
  end

  defp format(messages) do
    Enum.map(messages, fn
      %{} = msg -> msg
      {:user, content} -> %{content: content, role: :user}
    end)
  end

  def update_context(attrs), do: Console.AI.Tool.upsert(attrs)

  @thread_preloads [session: [:connection, :pull_request, :stack], user: :groups]

  def setup_context(%AgentSession{} = session) do
    thread = ChatSvc.get_thread!(session.thread_id)
             |> Repo.preload(@thread_preloads)
    Console.AI.Tool.context(%{
      user: thread.user,
      flow: thread.flow,
      insight: thread.insight,
      session: thread.session
    })
    {thread, thread.session}
  end

  def initialized(%AgentSession{} = session) do
    refetch(session)
    |> AgentSession.changeset(%{initialized: true})
    |> Console.Repo.update()
  end

  def done(%AgentSession{} = session, done \\ true) do
    refetch(session)
    |> AgentSession.changeset(%{done: done})
    |> Console.Repo.update()
  end

  def user_message(content) when is_binary(content) do
    stream = Stream.stream(:user)
    Stream.publish(stream, content, 1)
    Stream.offset(1)
    {:user, content}
  end
end
