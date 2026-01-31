defmodule Console.OpenAPI.AI.Sentinel do
  @moduledoc """
  OpenAPI schema for sentinels.

  A sentinel is an automated monitoring and testing system that runs checks against
  your infrastructure. Sentinels can perform log analysis, Kubernetes resource checks,
  and integration tests across clusters.
  """
  use Console.OpenAPI.Base

  defschema List, "A list of sentinels", %{
    type: :object,
    description: "A paginated list of sentinels",
    properties: %{
      data: array_of(Console.OpenAPI.AI.Sentinel)
    }
  }

  defschema %{
    type: :object,
    title: "Sentinel",
    description: "An automated monitoring system that runs checks against your infrastructure",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the sentinel"),
      name: string(description: "Human-readable name of this sentinel"),
      description: string(description: "Description of what this sentinel monitors"),
      status: ecto_enum(Console.Schema.SentinelRun.Status, description: "Status of the sentinel's last run (pending, success, failed)"),
      last_run_at: datetime(description: "Timestamp of when this sentinel was last executed"),
      project_id: string(description: "ID of the project this sentinel belongs to"),
      repository_id: string(description: "ID of the git repository for rule files"),
      checks: array_of(Console.OpenAPI.AI.SentinelCheck, description: "List of checks configured for this sentinel"),
    })
  }
end

defmodule Console.OpenAPI.AI.SentinelCheck do
  @moduledoc """
  OpenAPI schema for sentinel checks.

  A check is a specific monitoring task within a sentinel, such as log analysis
  or Kubernetes resource validation.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "SentinelCheck",
    description: "A specific monitoring check within a sentinel",
    properties: %{
      id: string(description: "Unique identifier for the check"),
      name: string(description: "Name of this check"),
      type: ecto_enum(Console.Schema.Sentinel.CheckType, description: "Type of check (log, kubernetes, integration_test)"),
      rule_file: string(description: "Path to the rule file for this check within the repository"),
    }
  }
end

defmodule Console.OpenAPI.AI.SentinelRun do
  @moduledoc """
  OpenAPI schema for sentinel runs.

  A sentinel run represents a single execution of a sentinel's checks.
  """
  use Console.OpenAPI.Base

  defschema List, "A list of sentinel runs", %{
    type: :object,
    description: "A paginated list of sentinel runs",
    properties: %{
      data: array_of(Console.OpenAPI.AI.SentinelRun)
    }
  }

  defschema %{
    type: :object,
    title: "SentinelRun",
    description: "A single execution of a sentinel's monitoring checks",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the sentinel run"),
      status: ecto_enum(Console.Schema.SentinelRun.Status, description: "Current status of the run (pending, success, failed)"),
      sentinel_id: string(description: "ID of the sentinel that was executed"),
      completed_at: datetime(description: "Timestamp when the run completed"),
      results: array_of(Console.OpenAPI.AI.SentinelCheckResult, description: "Results of individual checks in this run"),
      jobs: array_of(Console.OpenAPI.AI.SentinelRunJob, description: "Jobs spawned by this sentinel run for integration tests"),
    })
  }
end

defmodule Console.OpenAPI.AI.SentinelCheckResult do
  @moduledoc """
  OpenAPI schema for sentinel check results.

  Contains the outcome of a single check within a sentinel run.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "SentinelCheckResult",
    description: "The result of a single check within a sentinel run",
    properties: %{
      name: string(description: "Name of the check that was executed"),
      status: ecto_enum(Console.Schema.SentinelRun.Status, description: "Status of this check (pending, success, failed)"),
      reason: string(description: "Reason for failure if the check failed"),
      job_count: integer(description: "Total number of jobs spawned for this check"),
      successful_count: integer(description: "Number of successful jobs"),
      failed_count: integer(description: "Number of failed jobs"),
    }
  }
end

defmodule Console.OpenAPI.AI.SentinelRunJob do
  @moduledoc """
  OpenAPI schema for sentinel run jobs.

  A job represents a single integration test execution within a sentinel run,
  typically running on a specific cluster.
  """
  use Console.OpenAPI.Base

  defschema %{
    type: :object,
    title: "SentinelRunJob",
    description: "An integration test job spawned by a sentinel run",
    properties: timestamps(%{
      id: string(description: "Unique identifier for the job"),
      check: string(description: "Name of the check this job belongs to"),
      status: ecto_enum(Console.Schema.SentinelRunJob.Status, description: "Current status of the job (pending, running, success, failed)"),
      format: ecto_enum(Console.Schema.SentinelRunJob.Format, description: "Output format of the job (plaintext, junit)"),
      output: string(description: "Output produced by the job"),
      completed_at: datetime(description: "Timestamp when the job completed"),
      cluster_id: string(description: "ID of the cluster this job ran on"),
      sentinel_run_id: string(description: "ID of the sentinel run this job belongs to"),
      repository_id: string(description: "ID of the git repository used for the test"),
    })
  }
end
