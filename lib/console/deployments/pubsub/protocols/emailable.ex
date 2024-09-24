defprotocol Console.Deployments.PubSub.Emailable do
  @fallback_to_any true

  @doc """
  Returns the payload and topics for a graphql subscription event
  """
  @spec email(term) :: %Bamboo.Email{} | :ok
  def email(event)
end

defimpl Console.Deployments.PubSub.Emailable, for: Any do
  def email(_), do: :ok
end

defimpl Console.Deployments.PubSub.Emailable, for: Console.PubSub.SharedSecretCreated do
  alias Console.Email.Builder.Secret
  def email(%{item: share, actor: actor}) do
    Secret.email(share, actor)
  end
end

defimpl Console.Deployments.PubSub.Emailable, for: Console.PubSub.AppNotificationCreated do
  alias Console.Schema.AppNotification
  alias Console.Email.Builder.Notification

  def email(%{item: %AppNotification{urgent: true} = notif}),
    do: Notification.email(notif)
  def email(_), do: :ok
end
