defmodule Console.AI.Research.Agent do
  use GenServer, restart: :transient
  import Console.AI.Agents.Base
  alias Console.Repo
  alias Console.AI.Research.Graph
  alias Console.Schema.{
    InfraResearch,
    User
  }
  alias Console.AI.{
    Stream,
    Chat,
    Provider,
    Tools.Agent.FinishInvestigation
  }
  require Logger

  @preface Console.priv_file!("prompts/research_diagram.md")

  defmodule State do
    defstruct [:caller, :research, :user, threads: []]
  end

  def registry(), do: Console.AI.Agents

  def enqueue(pid, task), do: GenServer.cast(pid, task)

  def start_link([%InfraResearch{} = research]), do: start_link(research)
  def start_link(%InfraResearch{} = research) do
    GenServer.start_link(__MODULE__, {research, self()}, name: via(research))
  end

  defp via(%InfraResearch{id: id}), do: {:via, Registry, {registry(), {:research, id}}}

  def init({research, caller}) do
    Logger.info("Starting infra research #{research.id}")
    Process.send_after(self(), :die, :timer.minutes(60))
    research = Repo.preload(research, [:user])
    {:ok, %State{caller: caller, research: research, user: research.user}, {:continue, :boot}}
  end

  def handle_continue(:boot, %State{research: research, user: user} = state) do
    Graph.new()
    update_research(research, %{status: :running})
    {:ok, thread} = create_thread(research, "Initial infrastructure research for #{research.prompt}")
    {thread, session} = setup_context(thread.session)

    Stream.topic(:thread, thread.id, thread.user)
    |> Stream.enable()

    drive(thread, [user_message(research.prompt)], user)
    enqueue(self(), :booted)

    done(session)
    save_associations(research, Graph.fetch())

    {:noreply, %{state | threads: [thread]}}
  end

  def handle_cast(:booted, %State{research: research, user: user, threads: threads} = state) do
    {:ok, thread} = create_thread(research, "Probing for any additional data to figure out the infrastructure for #{research.prompt}")
    {thread, session} = setup_context(thread.session)

    Stream.topic(:thread, thread.id, thread.user)
    |> Stream.enable()

    drive(thread, [
      user_message(research.prompt),
      user_message("""
        I've already found a lot of data, here is the current state of the knowledge graph found:

        ```json
        #{Graph.encode!()}
        ```

        Do another pass to add any other information you can find about the above query.
        """
      )
    ], user)

    enqueue(self(), :researched)

    done(session)
    save_associations(research, Graph.fetch())

    {:noreply, %{state | threads: [thread | threads]}}
  end

  def handle_cast(:researched, %State{research: research} = state) do
    messages = [
      {:user, research.prompt},
      {:assistant, """
        I've already found a based on this query, here is it below:

        ```json
        #{Graph.encode!()}
        ```

        Now please generate an architecture diagram, summary of the system in question and any notes for open questions
        that still remain.
      """}
    ]

    with {:ok, result} <- Provider.simple_tool_call(messages, FinishInvestigation, preface: @preface) do
      update_research(research, %{
        status: :completed,
        analysis: %{summary: result.summary, notes: result.notes},
        diagram: result.diagram
      })
      |> case do
        {:error, error} -> Logger.error("Error updating research #{research.id}: #{inspect(error)}")
        {:ok, _} -> Logger.info("Research #{research.id} updated with analysis")
      end
    end

    send(state.caller, :done)
    {:noreply, state}
  end

  def handle_cast(_, state), do: {:noreply, state}

  def handle_info(:die, %State{threads: threads} = state) do
    Logger.info("Infra research #{state.research.id} timed out, stopping")
    Enum.each(threads, &Repo.delete/1)

    {:stop, :normal, state}
  end

  def handle_info(_, state), do: {:noreply, state}

  defp create_thread(%InfraResearch{user: %User{} = user} = research, summary) do
    Chat.create_thread(%{
      research_id: research.id,
      summary: summary,
      session: %{type: :research}
    }, user)
  end

  @regex ~r/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  defp save_associations(%InfraResearch{} = research, %Graph{service_ids: sids, stack_ids: stids}) do
    sids   = Enum.filter(sids, &Regex.match?(@regex, &1)) |> Enum.uniq()
    stids  = Enum.filter(stids, &Regex.match?(@regex, &1)) |> Enum.uniq()
    assocs = Enum.map(sids, & %{service_id: &1}) ++ Enum.map(stids, & %{stack_id: &1})

    update_research(research, %{associations: assocs})
  end

  defp update_research(%InfraResearch{} = research, attrs) do
    Repo.preload(research, [:associations])
    |> InfraResearch.changeset(attrs)
    |> Repo.update()
  end
end
