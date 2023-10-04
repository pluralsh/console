defimpl Console.PubSub.Auditable, for: [
  Console.PubSub.ServiceCreated,
  Console.PubSub.ServiceUpdated,
  Console.PubSub.ServiceDeleted,
  Console.PubSub.ClusterCreated,
  Console.PubSub.ClusterUpdated,
  Console.PubSub.ClusterDeleted,
  Console.PubSub.ProviderCreated,
  Console.PubSub.ProviderUpdated,
  Console.PubSub.ProviderCredentialCreated,
  Console.PubSub.ProviderCredentialDeleted,
  Console.PubSub.GitRepositoryCreated,
  Console.PubSub.GitRepositoryUpdated,
  Console.PubSub.GitRepositoryDeleted,
  Console.PubSub.DeploymentSettingsUpdated,
] do
  alias Console.Schema.{Audit, User}

  def audit(%{item: item, actor: %User{} = user}) do
    {type, action} = details(@for)
    %Audit{
      type: type,
      action: action,
      data: item,
      actor_id: user.id
    }
  end
  def audit(_), do: :ok

  def details(Console.PubSub.ServiceCreated), do: {:service, :create}
  def details(Console.PubSub.ServiceUpdated), do: {:service, :update}
  def details(Console.PubSub.ServiceDeleted), do: {:service, :delete}
  def details(Console.PubSub.ClusterCreated), do: {:cluster, :create}
  def details(Console.PubSub.ClusterUpdated), do: {:cluster, :update}
  def details(Console.PubSub.ClusterDeleted), do: {:cluster, :delete}
  def details(Console.PubSub.ProviderCreated), do: {:cluster_provider, :create}
  def details(Console.PubSub.ProviderUpdated), do: {:cluster_provider, :update}
  def details(Console.PubSub.ProviderCredentialCreated), do: {:provider_credential, :create}
  def details(Console.PubSub.ProviderCredentialDeleted), do: {:provider_credential, :delete}
  def details(Console.PubSub.GitRepositoryCreated), do: {:git_repository, :create}
  def details(Console.PubSub.GitRepositoryUpdated), do: {:git_repository, :create}
  def details(Console.PubSub.GitRepositoryDeleted), do: {:git_repository, :create}
  def details(Console.PubSub.DeploymentSettingsUpdated), do: {:deployment_settings, :create}
end
