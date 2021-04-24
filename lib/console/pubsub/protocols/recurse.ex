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

defimpl Console.PubSub.Recurse, for: Console.PubSub.BuildDeleted do
  def process(%{item: _}) do
    Console.Deployer.cancel()
  end
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.BuildApproved do
  require Logger
  def process(%{item: _}) do
    Logger.info "kicking any active runners"
    Swarm.members(:builds) |> IO.inspect()
    Console.Runner.kick()
  end
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.UserCreated do
  alias Console.Schema.{Group, GroupMember}

  def process(%{item: %{id: user_id}}) do
    groups = Group.global() |> Console.Repo.all()
    data = Enum.map(groups, &Console.Services.Base.timestamped(%{group_id: &1.id, user_id: user_id}))
    Console.Repo.insert_all(GroupMember, data)
  end
end
