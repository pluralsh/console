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

defimpl Console.PubSub.Auditable, for: [Console.PubSub.TemporaryTokenCreated] do
  alias Console.Schema.Audit

  def audit(%{item: user}) do
    %Audit{
      type: :temp_token,
      action: :create,
      data: user,
      actor_id: user.id
    }
  end
end
