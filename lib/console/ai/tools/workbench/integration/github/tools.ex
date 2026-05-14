defmodule Console.AI.Tools.Workbench.Integration.Github.Tools do
  @moduledoc false

  alias Console.Schema.WorkbenchTool

  @issues [
    Console.AI.Tools.Workbench.Integration.Github.AddIssueComment,
    Console.AI.Tools.Workbench.Integration.Github.IssueRead,
    Console.AI.Tools.Workbench.Integration.Github.ListIssues,
    Console.AI.Tools.Workbench.Integration.Github.SearchIssues
  ]

  @pull_requests [
    Console.AI.Tools.Workbench.Integration.Github.AddCommentToPendingReview,
    Console.AI.Tools.Workbench.Integration.Github.AddReactionToPullRequestComment,
    Console.AI.Tools.Workbench.Integration.Github.AddReplyToPullRequestComment,
    Console.AI.Tools.Workbench.Integration.Github.ListPullRequests,
    Console.AI.Tools.Workbench.Integration.Github.PullRequestRead,
    Console.AI.Tools.Workbench.Integration.Github.PullRequestReviewWrite,
    Console.AI.Tools.Workbench.Integration.Github.SearchPullRequests
  ]

  @repos [
    Console.AI.Tools.Workbench.Integration.Github.GetLatestRelease,
    Console.AI.Tools.Workbench.Integration.Github.GetReleaseByTag,
    Console.AI.Tools.Workbench.Integration.Github.GetTag,
    Console.AI.Tools.Workbench.Integration.Github.ListBranches,
    Console.AI.Tools.Workbench.Integration.Github.ListReleases,
    Console.AI.Tools.Workbench.Integration.Github.ListTags,
    Console.AI.Tools.Workbench.Integration.Github.SearchRepositories
  ]

  @default @issues ++ @pull_requests ++ @repos

  def expand(%WorkbenchTool{} = tool) do
    Enum.map(modules_for(tool), &struct(&1, tool: tool))
  end

  defp modules_for(%WorkbenchTool{configuration: %{github: github}}) do
    case github do
      %{toolset: ts} when ts in [nil, "", "default", "all"] -> @default
      %{toolset: "issues"} -> @issues
      %{toolset: "pull_requests"} -> @pull_requests
      %{toolset: "repos"} -> @repos
      %{toolset: _} -> @default
      _ -> @default
    end
  end

  defp modules_for(_), do: @default
end
