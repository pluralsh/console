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

defimpl Console.PubSub.Recurse, for: [Console.PubSub.BuildDeleted, Console.PubSub.BuildCancelled] do
  def process(%{item: _}) do
    Console.Deployer.cancel()
  end
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.BuildCreated do
  def process(_), do: Console.Deployer.wake()
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.BuildApproved do
  require Logger
  alias Console.Schema.Build

  def process(%{item: %Build{pid: p}}) when is_pid(p), do: send(p, :kick)
  def process(_) do
    Logger.info "kicking any active runners"
    Swarm.members(:builds)
    |> IO.inspect()
    Console.Runner.kick()
  end
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.BuildFailed do
  require Logger
  alias Console.Schema.Command
  alias Console.PubSub.{Broadcaster, CommandCompleted}

  def process(%{item: build}) do
    Logger.info "cleaning up noncompleted jobs"

    Command.for_build(build.id)
    |> Command.uncompleted()
    |> Command.selected()
    |> Console.Repo.update_all(set: [completed_at: DateTime.utc_now(), exit_code: 1])
    |> elem(1)
    |> Enum.each(&Broadcaster.notify(%CommandCompleted{item: &1}))

    Console.Services.Builds.failed_incident(build)
  end
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
