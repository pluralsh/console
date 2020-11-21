defprotocol Watchman.PubSub.Auditable do
  @moduledoc """
  grab-bag event handling logic
  """
  @fallback_to_any true
  @spec audit(struct) :: term
  def audit(event)
end

defimpl Watchman.PubSub.Auditable, for: Any do
  def audit(_), do: :ok
end

defimpl Watchman.PubSub.Auditable, for: Watchman.PubSub.BuildCreated do
  alias Watchman.Schema.Audit

  def audit(%{item: %{repository: repo} = build, actor: user}) do
    %Audit{
      type: :build,
      action: :create,
      repository: repo,
      data: build,
      actor_id: user.id
    }
  end
end

defimpl Watchman.PubSub.Auditable, for: Watchman.PubSub.BuildApproved do
  alias Watchman.Schema.Audit

  def audit(%{item: %{repository: repo} = build, actor: user}) do
    %Audit{
      type: :build,
      action: :approve,
      repository: repo,
      data: build,
      actor_id: user.id
    }
  end
end

defimpl Watchman.PubSub.Auditable, for: Watchman.PubSub.BuildCancelled do
  alias Watchman.Schema.Audit

  def audit(%{item: %{repository: repo} = build, actor: user}) do
    %Audit{
      type: :build,
      action: :cancel,
      repository: repo,
      data: build,
      actor_id: user.id
    }
  end
end

defimpl Watchman.PubSub.Auditable, for: Watchman.PubSub.UserCreated do
  alias Watchman.Schema.Audit

  def audit(%{item: %{repository: repo} = build, actor: user}) do
    %Audit{
      type: :build,
      action: :approve,
      repository: repo,
      data: build,
      actor_id: user.id
    }
  end
end