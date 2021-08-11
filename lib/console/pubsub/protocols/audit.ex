defprotocol Console.PubSub.Auditable do
  @moduledoc """
  grab-bag event handling logic
  """
  @fallback_to_any true
  @spec audit(struct) :: term
  def audit(event)
end

defimpl Console.PubSub.Auditable, for: Any do
  def audit(_), do: :ok
end

defimpl Console.PubSub.Auditable, for: Console.PubSub.BuildCreated do
  alias Console.Schema.Audit

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

defimpl Console.PubSub.Auditable, for: Console.PubSub.BuildApproved do
  alias Console.Schema.Audit

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

defimpl Console.PubSub.Auditable, for: Console.PubSub.BuildCancelled do
  alias Console.Schema.Audit

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

defimpl Console.PubSub.Auditable, for: [Console.PubSub.UpgradePolicyCreated, Console.PubSub.UpgradePolicyDeleted] do
  alias Console.Schema.Audit

  def audit(%{item: policy, actor: user}) do
    %Audit{
      type: :policy,
      action: action(@for),
      data: policy,
      actor_id: user.id
    }
  end

  def action(Console.PubSub.UpgradePolicyCreated), do: :create
  def action(Console.PubSub.UpgradePolicyDeleted), do: :delete
end
