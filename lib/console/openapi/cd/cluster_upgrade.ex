defmodule Console.OpenAPI.CD.ClusterUpgradeStep do
  @moduledoc """
  OpenAPI schema for cluster upgrade steps.

  A cluster upgrade step represents a discrete action taken during an upgrade workflow.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "ClusterUpgradeStep",
    description: "A step in an agentic cluster upgrade workflow",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the upgrade step"),
      name: string(description: "Name of the upgrade step"),
      prompt: string(description: "Prompt used to generate the upgrade step"),
      status: ecto_enum(Console.Schema.ClusterUpgrade.Status, description: "Status of the step (pending, in_progress, completed, failed)"),
      type: ecto_enum(Console.Schema.ClusterUpgradeStep.Type, description: "Type of step (addon, cloud_addon, infrastructure)"),
      error: string(description: "Error message if the step failed"),
      upgrade_id: string(description: "ID of the cluster upgrade this step belongs to"),
      agent_run: Console.OpenAPI.AI.AgentRun,
      agent_run_id: string(description: "ID of the agent run associated with this step, if any")
    })
  }
end

defmodule Console.OpenAPI.CD.ClusterUpgrade do
  @moduledoc """
  OpenAPI schema for cluster upgrades.

  A cluster upgrade represents an agentic workflow that upgrades a cluster to the next version.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "ClusterUpgrade",
    description: "An agentic workflow for upgrading a cluster",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the cluster upgrade"),
      version: string(description: "Target Kubernetes version for this upgrade"),
      status: ecto_enum(Console.Schema.ClusterUpgrade.Status, description: "Status of the upgrade (pending, in_progress, completed, failed)"),
      prompt: string(description: "Prompt used to generate the upgrade workflow"),
      cluster_id: string(description: "ID of the cluster being upgraded"),
      user_id: string(description: "ID of the user who initiated the upgrade"),
      runtime_id: string(description: "ID of the agent runtime executing the upgrade"),
      steps: array_of(Console.OpenAPI.CD.ClusterUpgradeStep, description: "Steps that make up this upgrade workflow"),
      runtime: Console.OpenAPI.AI.AgentRuntime,
      user: Console.OpenAPI.User
    })
  }
end

defmodule Console.OpenAPI.CD.ClusterUpgradeInput do
  @moduledoc """
  OpenAPI schema for cluster upgrade creation input.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "ClusterUpgradeInput",
    description: "Input for creating a cluster upgrade workflow",
    properties: %{
      prompt: string(description: "Optional prompt to guide the upgrade workflow"),
      runtime_id: string(description: "Optional agent runtime ID to execute the upgrade")
    }
  }
end
