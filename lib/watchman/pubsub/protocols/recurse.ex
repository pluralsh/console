defprotocol Watchman.PubSub.Recurse do
  @moduledoc """
  grab-bag event handling logic
  """
  @fallback_to_any true
  @spec process(struct) :: term
  def process(event)
end

defimpl Watchman.PubSub.Recurse, for: Any do
  def process(_), do: :ok
end

defimpl Watchman.PubSub.Recurse, for: Watchman.PubSub.BuildDeleted do
  def process(%{item: _}) do
    Watchman.Deployer.cancel()
  end
end

defimpl Watchman.PubSub.Recurse, for: Watchman.PubSub.BuildApproved do
  require Logger
  def process(%{item: _}) do
    Logger.info "kicking any active runners"
    Swarm.members(:builds) |> IO.inspect()
    Watchman.Runner.kick()
  end
end

defimpl Watchman.PubSub.Recurse, for: Watchman.PubSub.UserCreated do
  alias Watchman.Schema.{Group, GroupMember}

  def process(%{item: %{id: user_id}}) do
    groups = Group.global() |> Watchman.Repo.all()
    data = Enum.map(groups, &Watchman.Services.Base.timestamped(%{group_id: &1.id, user_id: user_id}))
    Watchman.Repo.insert_all(GroupMember, data)
  end
end