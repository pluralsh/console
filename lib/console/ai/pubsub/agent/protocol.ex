defprotocol Console.AI.PubSub.Agent.Actionable do
  @fallback_to_any true

  @spec act(any) :: {:ok, struct} | :ok
  def act(struct)
end

defimpl Console.AI.PubSub.Agent.Actionable, for: Any do
  def act(_), do: :ok
end

defimpl Console.AI.PubSub.Agent.Actionable, for: Console.PubSub.AgentSessionCreated do
  alias Console.Schema.AgentSession
  alias Console.AI.Agents.{Discovery, Terraform}

  def act(%@for{item: %AgentSession{} = session}),
    do: Discovery.boot(Terraform, session)
end

defimpl Console.AI.PubSub.Agent.Actionable, for: Console.PubSub.StackRunCompleted do
  alias Console.Schema.{AgentSession, StackRun, PullRequest}
  alias Console.AI.Agents.{Discovery, Terraform}

  def act(%@for{item: %StackRun{pull_request_id: id} = run}) when is_binary(id) do
    case Console.Repo.preload(run, [:state, pull_request: :session]) do
      %StackRun{pull_request: %PullRequest{session: %AgentSession{} = session}} ->
        Discovery.enqueue(Terraform, session, run)
      _ -> :ok
    end
  end
  def act(_), do: :ok
end
