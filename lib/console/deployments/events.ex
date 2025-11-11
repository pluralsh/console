defmodule Console.PubSub.ServiceCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ServiceUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ServiceDeleted, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ServiceComponentsUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ServiceHardDeleted, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ServiceManifestsRequested, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ServiceDependenciesUpdated, do: use Piazza.PubSub.Event

defmodule Console.PubSub.ClusterCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ClusterUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ClusterDeleted, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ClusterPinged, do: use Piazza.PubSub.Event

defmodule Console.PubSub.ProviderCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ProviderUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ProviderDeleted, do: use Piazza.PubSub.Event

defmodule Console.PubSub.ProviderCredentialCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ProviderCredentialDeleted, do: use Piazza.PubSub.Event

defmodule Console.PubSub.AgentMigrationCreated, do: use Piazza.PubSub.Event

defmodule Console.PubSub.GitRepositoryCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.GitRepositoryUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.GitRepositoryDeleted, do: use Piazza.PubSub.Event

defmodule Console.PubSub.DeploymentSettingsUpdated, do: use Piazza.PubSub.Event

defmodule Console.PubSub.GlobalServiceCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.GlobalServiceUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.GlobalServiceDeleted, do: use Piazza.PubSub.Event

defmodule Console.PubSub.PipelineUpserted, do: use Piazza.PubSub.Event
defmodule Console.PubSub.PipelineDeleted, do: use Piazza.PubSub.Event
defmodule Console.PubSub.PipelineStageUpdated, do: use Piazza.PubSub.Event

defmodule Console.PubSub.PipelineContextCreated, do: use Piazza.PubSub.Event

defmodule Console.PubSub.PipelineGateApproved, do: use Piazza.PubSub.Event
defmodule Console.PubSub.PipelineGateUpdated, do: use Piazza.PubSub.Event

defmodule Console.PubSub.PipelineEdgeUpdated, do: use Piazza.PubSub.Event

defmodule Console.PubSub.PromotionCreated, do: use Piazza.PubSub.Event

defmodule Console.PubSub.ClusterRestoreCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ObjectStoreCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ObjectStoreUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ObjectStoreDeleted, do: use Piazza.PubSub.Event

defmodule Console.PubSub.PullRequestCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.PullRequestUpdated, do: use Piazza.PubSub.Event

defmodule Console.PubSub.ManagedNamespaceCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ManagedNamespaceUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ManagedNamespaceDeleted, do: use Piazza.PubSub.Event

defmodule Console.PubSub.StackCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.StackUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.StackDeleted, do: use Piazza.PubSub.Event
defmodule Console.PubSub.StackDetached, do: use Piazza.PubSub.Event

defmodule Console.PubSub.StackRunCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.StackRunUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.StackRunDeleted, do: use Piazza.PubSub.Event
defmodule Console.PubSub.StackRunCompleted, do: use Piazza.PubSub.Event

defmodule Console.PubSub.RunLogsCreated, do: use Piazza.PubSub.Event

defmodule Console.PubSub.SharedSecretCreated, do: use Piazza.PubSub.Event

defmodule Console.PubSub.AppNotificationCreated, do: use Piazza.PubSub.Event

defmodule Console.PubSub.ServiceInsight, do: use Piazza.PubSub.Event
defmodule Console.PubSub.StackInsight, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ClusterInsight, do: use Piazza.PubSub.Event
defmodule Console.PubSub.StackStateInsight, do: use Piazza.PubSub.Event
defmodule Console.PubSub.AlertInsight, do: use Piazza.PubSub.Event

defmodule Console.PubSub.AlertCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.AlertResolutionCreated, do: use Piazza.PubSub.Event

defmodule Console.PubSub.ScmWebhook, do: use Piazza.PubSub.Event

defmodule Console.PubSub.FlowCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.FlowUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.FlowDeleted, do: use Piazza.PubSub.Event

defmodule Console.PubSub.PreviewEnvironmentTemplateCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.PreviewEnvironmentTemplateUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.PreviewEnvironmentTemplateDeleted, do: use Piazza.PubSub.Event

defmodule Console.PubSub.PreviewEnvironmentInstanceCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.PreviewEnvironmentInstanceUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.PreviewEnvironmentInstanceDeleted, do: use Piazza.PubSub.Event

defmodule Console.PubSub.AgentRunCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.AgentRunUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.AgentRunDeleted, do: use Piazza.PubSub.Event
defmodule Console.PubSub.AgentMessageCreated, do: use Piazza.PubSub.Event

defmodule Console.PubSub.PrAutomationCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.PrAutomationUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.PrAutomationDeleted, do: use Piazza.PubSub.Event

defmodule Console.PubSub.CatalogCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.CatalogUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.CatalogDeleted, do: use Piazza.PubSub.Event
