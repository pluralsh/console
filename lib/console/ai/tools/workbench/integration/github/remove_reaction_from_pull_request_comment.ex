defmodule Console.AI.Tools.Workbench.Integration.Github.RemoveReactionFromPullRequestComment do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GithubConnection}
  alias Console.AI.Tools.Workbench.Integration.Github.{Client, Response}

  @comment_types ~w(issue_comment pull_request_review commit)

  embedded_schema do
    field :tool,          :map, virtual: true
    field :owner,         :string
    field :repo,          :string
    field :comment_id,    :integer
    field :reaction_id,   :integer
    field :comment_type,  :string, default: "pull_request_review"
  end

  @json_schema Console.priv_file!("tools/workbench/integration/github/remove_reaction_from_pull_request_comment.json")
               |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "github_#{n}_remove_reaction_from_pull_request_comment"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do:
      "Remove a reaction (#{n}) from a GitHub issue comment, pull request review comment, or commit comment via REST. Use comment_type to select the endpoint."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:owner, :repo, :comment_id, :reaction_id, :comment_type])
    |> validate_required([:owner, :repo, :comment_id, :reaction_id])
    |> ensure_comment_type_default()
    |> validate_inclusion(:comment_type, @comment_types)
  end

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}}} = m) do
    with {:ok, client} <- Client.build(m.tool) do
      m
      |> path()
      |> then(&Client.json_delete(client, &1))
      |> Response.json()
    end
  end

  def implement(%__MODULE__{}), do: {:error, "GitHub is not configured for this workbench tool."}

  defp path(%__MODULE__{comment_type: "issue_comment"} = m),
    do: "repos/#{m.owner}/#{m.repo}/issues/comments/#{m.comment_id}/reactions/#{m.reaction_id}"

  defp path(%__MODULE__{comment_type: "commit"} = m),
    do: "repos/#{m.owner}/#{m.repo}/comments/#{m.comment_id}/reactions/#{m.reaction_id}"

  defp path(%__MODULE__{} = m),
    do: "repos/#{m.owner}/#{m.repo}/pulls/comments/#{m.comment_id}/reactions/#{m.reaction_id}"

  defp ensure_comment_type_default(cs) do
    case get_change(cs, :comment_type) || get_field(cs, :comment_type) do
      t when t in [nil, ""] -> put_change(cs, :comment_type, "pull_request_review")
      _ -> cs
    end
  end
end
