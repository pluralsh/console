defprotocol Console.PubSub.Recurse do
  @moduledoc """
  grab-bag event handling logic
  """
  @fallback_to_any true
  @spec process(struct) :: term
  def process(event)
end

defimpl Console.PubSub.Recurse, for: Any do
  def process(_), do: :ok
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.UserCreated do
  alias Console.Schema.{Group, GroupMember}

  def process(%{item: %{id: user_id}}) do
    groups = Group.global()
             |> Console.Repo.all()
    data = Enum.map(groups, &Console.Services.Base.timestamped(%{
      group_id: &1.id,
      user_id: user_id
    }))
    Console.Repo.insert_all(GroupMember, data)
  end
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.AccessTokenUsage do
  def process(%{item: token, context: %{ip: ip}}) do
    trunc = Timex.now()
            |> Timex.set(minute: 0, second: 0, microsecond: {0, 6})
    key = "#{token.id}:#{ip}:#{Timex.format!(trunc, "{ISO:Extended}")}"

    Console.Buffer.Orchestrator.submit(Console.Buffers.TokenAudit, key, {token.id, trunc, ip})
  end
end
