defimpl Console.PubSub.Auditable, for: [
  Console.PubSub.ServiceCreated,
  Console.PubSub.ServiceUpdated,
  Console.PubSub.ServiceDeleted,
  Console.PubSub.ClusterCreated,
  Console.PubSub.ClusterUpdated,
  Console.PubSub.ClusterDeleted,
  Console.PubSub.ProviderCreated,
  Console.PubSub.ProviderUpdated,
  Console.PubSub.ProviderDeleted,
  Console.PubSub.ProviderCredentialCreated,
  Console.PubSub.ProviderCredentialDeleted,
  Console.PubSub.GlobalServiceCreated,
  Console.PubSub.GlobalServiceDeleted,
  Console.PubSub.GitRepositoryCreated,
  Console.PubSub.GitRepositoryUpdated,
  Console.PubSub.GitRepositoryDeleted,
  Console.PubSub.DeploymentSettingsUpdated,
  Console.PubSub.PipelineGateUpdated,
  Console.PubSub.PipelineUpdated,
  Console.PubSub.PipelineCreated,
  Console.PubSub.PipelineDeleted,
] do
  alias Console.Schema.{Audit, User, PipelineGate}

  def audit(%{item: item, actor: %User{} = user}) do
    {type, action} = details(@for)
    %Audit{
      type: type,
      action: action,
      item_id: item.id,
      data: (if embeddable?(@for), do: item, else: nil),
      actor_id: user.id
    }
  end
  def audit(_), do: :ok

  def embeddable?(Console.PubSub.ServiceCreated), do: true
  def embeddable?(Console.PubSub.ServiceUpdated), do: true
  def embeddable?(Console.PubSub.ServiceDeleted), do: true
  def embeddable?(Console.PubSub.ClusterCreated), do: true
  def embeddable?(Console.PubSub.ClusterUpdated), do: true
  def embeddable?(Console.PubSub.ClusterDeleted), do: true
  def embeddable?(Console.PubSub.DeploymentSettingsUpdated), do: false
  def embeddable?(_), do: false

  def details(Console.PubSub.ServiceCreated), do: {:service, :create}
  def details(Console.PubSub.ServiceUpdated), do: {:service, :update}
  def details(Console.PubSub.ServiceDeleted), do: {:service, :delete}
  def details(Console.PubSub.ClusterCreated), do: {:cluster, :create}
  def details(Console.PubSub.ClusterUpdated), do: {:cluster, :update}
  def details(Console.PubSub.ClusterDeleted), do: {:cluster, :delete}
  def details(Console.PubSub.ProviderCreated), do: {:cluster_provider, :create}
  def details(Console.PubSub.ProviderUpdated), do: {:cluster_provider, :update}
  def details(Console.PubSub.ProviderDeleted), do: {:cluster_provider, :delete}
  def details(Console.PubSub.ProviderCredentialCreated), do: {:provider_credential, :create}
  def details(Console.PubSub.ProviderCredentialDeleted), do: {:provider_credential, :delete}
  def details(Console.PubSub.GitRepositoryCreated), do: {:git_repository, :create}
  def details(Console.PubSub.GitRepositoryUpdated), do: {:git_repository, :create}
  def details(Console.PubSub.GitRepositoryDeleted), do: {:git_repository, :create}
  def details(Console.PubSub.DeploymentSettingsUpdated), do: {:deployment_settings, :create}
  def details(Console.PubSub.PipelineCreated), do: {:pipeline, :create}
  def details(Console.PubSub.PipelineUpdated), do: {:pipeline, :update}
  def details(Console.PubSub.PipelineDeleted), do: {:pipeline, :delete}
  def details(Console.PubSub.GlobalServiceCreated), do: {:global, :create}
  def details(Console.PubSub.GlobalServiceDeleted), do: {:global, :delete}

  def details(Console.PubSub.PipelineApproved), do: {:pipeline, :approve}

  def item_id(%PipelineGate{edge: %{pipeline_id: id}}), do: id
  def item_id(%{id: id}), do: id
end
