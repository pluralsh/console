defmodule Console.PubSub.ServiceCreated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ServiceUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ServiceDeleted, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ServiceComponentsUpdated, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ServiceHardDeleted, do: use Piazza.PubSub.Event
defmodule Console.PubSub.ServiceManifestsRequested, do: use Piazza.PubSub.Event

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

defmodule Console.PubSub.PipelineGateApproved, do: use Piazza.PubSub.Event
defmodule Console.PubSub.PipelineGateUpdated, do: use Piazza.PubSub.Event

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
