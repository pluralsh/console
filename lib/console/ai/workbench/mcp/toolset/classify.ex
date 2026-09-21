defmodule Console.AI.Workbench.MCP.Toolset.Classify do
  @moduledoc """
  Static metadata about expanded workbench tools, for surfaces that need to reason about a
  tool before running it.

  The read-only set is an allowlist on purpose.  Anything not named here is treated as
  mutating, so a tool added later cannot silently show up on a read-only surface like the
  workbench MCP server without someone deciding that it should.
  """
  alias Console.AI.Tools.Agent.{ServiceComponent, Stack}
  alias Console.AI.Tools.Workbench.{Http, Infrastructure, Observability, SummarizeComponent}
  alias Console.AI.Tools.Workbench.Observability.Plrl
  alias Console.AI.Tools.Workbench.Integration.{
    AzureDevops,
    Bitbucket,
    BitbucketDatacenter,
    Docker,
    Github,
    Gitlab,
    Jira,
    Pagerduty,
    Sentry,
    Slack,
    Teams
  }
  alias Console.Schema.WorkbenchTool

  @observability [
    Observability.Metrics,
    Observability.MetricsSearch,
    Observability.MetricsLabelSearch,
    Observability.Logs,
    Observability.LogAggregate,
    Observability.Traces,
    Observability.ExternalDashboard,
    Observability.ExternalDashboards,
    Observability.ExternalMonitor,
    Observability.ExternalMonitors,
    Plrl.Logs,
    Plrl.LogsAggregate,
    Plrl.LogLabels,
    Plrl.Metrics,
    Plrl.MetricsSearch,
    Plrl.MetricsLabelSearch,
    Infrastructure.PodLogs
  ]

  @infrastructure [
    Infrastructure.ApiDiscovery,
    Infrastructure.ApiSpec,
    Infrastructure.Cluster,
    Infrastructure.ClusterList,
    Infrastructure.ClusterTags,
    Infrastructure.Projects,
    Infrastructure.StackList,
    Infrastructure.StackInspect,
    Infrastructure.StateSearch,
    Infrastructure.RawKubeGet,
    Infrastructure.RawKubeList,
    Infrastructure.Vulns,
    Infrastructure.CloudSchemas,
    Infrastructure.CloudTables,
    Infrastructure.RawCloudQuery,
    SummarizeComponent,
    ServiceComponent,
    Stack
  ]

  @integration [
    AzureDevops.PullRequestRead,
    AzureDevops.WorkItemRead,
    Bitbucket.IssueRead,
    Bitbucket.PullRequestRead,
    BitbucketDatacenter.IssueRead,
    BitbucketDatacenter.PullRequestRead,
    Docker.FetchManifest,
    Docker.SearchTags,
    Github.GetCodeScanningAlert,
    Github.GetDependabotAlert,
    Github.GetLatestRelease,
    Github.GetReleaseByTag,
    Github.GetSecretScanningAlert,
    Github.GetTag,
    Github.IssueRead,
    Github.ListBranches,
    Github.ListCodeScanningAlerts,
    Github.ListDependabotAlerts,
    Github.ListIssues,
    Github.ListPullRequests,
    Github.ListReleases,
    Github.ListSecretScanningAlerts,
    Github.ListTags,
    Github.PullRequestRead,
    Github.SearchIssues,
    Github.SearchPullRequests,
    Github.SearchRepositories,
    Gitlab.IssueRead,
    Gitlab.MergeRequestRead,
    Jira.GetIssue,
    Jira.ListComments,
    Jira.ListIssues,
    Pagerduty.GetIncident,
    Pagerduty.ListIncidentLogEntries,
    Pagerduty.ListIncidentNotes,
    Pagerduty.ListIncidents,
    Sentry.EventRead,
    Sentry.GetLatestIssueEvent,
    Sentry.IssueRead,
    Sentry.ListIssueEvents,
    Sentry.ListIssues,
    Slack.FindChannelByName,
    Slack.ListChannels,
    Slack.ListMessages,
    Slack.ListUserGroups,
    Teams.ListChannelMessages,
    Teams.ListChannels,
    Teams.ListTeams,
    Teams.SearchGroups,
    Teams.SearchTeams,
    Teams.SearchUsers
  ]

  @readonly MapSet.new(@observability ++ @infrastructure ++ @integration)

  @doc """
  Whether a tool only reads.  The generic http tool is judged by its configured method,
  everything else by module.
  """
  @spec readonly?(term) :: boolean
  def readonly?(%Http{tool: %WorkbenchTool{configuration: %{http: %{method: :get}}}}), do: true
  def readonly?(%Http{}), do: false
  def readonly?(%mod{}), do: MapSet.member?(@readonly, mod)
  def readonly?(mod) when is_atom(mod), do: MapSet.member?(@readonly, mod)
  def readonly?(_), do: false

  @doc """
  The workbench tool category a builtin tool belongs to.  Tools expanded from a
  `WorkbenchTool` carry their own categories and never need this.
  """
  @spec bucket(module) :: atom | nil
  def bucket(mod) when mod in @observability, do: :observability
  def bucket(mod) when mod in @infrastructure, do: :infrastructure
  def bucket(_), do: nil
end
