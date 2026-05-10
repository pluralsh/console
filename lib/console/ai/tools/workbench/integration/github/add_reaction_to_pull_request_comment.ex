defmodule Console.AI.Tools.Workbench.Integration.Github.AddReactionToPullRequestComment do
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
    field :content,       :string
    field :comment_type,  :string, default: "pull_request_review"
  end

  @json_schema Console.priv_file!("tools/workbench/integration/github/add_reaction_to_pull_request_comment.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "github_#{n}_add_reaction_to_pull_request_comment"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do:
      "Add an emoji reaction (#{n}) to a GitHub comment via REST (e.g. +1, heart, eyes). Use comment_type for issue_comment (issue/PR thread comment), pull_request_review (inline review comment), or commit (commit comment)."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:owner, :repo, :comment_id, :content, :comment_type])
    |> validate_required([:owner, :repo, :comment_id, :content])
    |> ensure_comment_type_default()
    |> validate_inclusion(:comment_type, @comment_types)
  end

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}}} = m) do
    with {:ok, client} <- Client.build(m.tool) do
      body = %{"content" => m.content}

      case comment_kind(m.comment_type) do
        :issue_comment ->
          Tentacat.Issues.Comments.Reactions.create(client, m.owner, m.repo, m.comment_id, body)

        :pull_request_review ->
          Tentacat.Pulls.Comments.Reactions.create(client, m.owner, m.repo, m.comment_id, body)

        :commit ->
          Tentacat.Comments.Reactions.create(client, m.owner, m.repo, m.comment_id, body)
      end
      |> Response.json()
    end
  end

  def implement(%__MODULE__{}), do: {:error, "GitHub is not configured for this workbench tool."}

  defp comment_kind("issue_comment"), do: :issue_comment
  defp comment_kind("commit"), do: :commit
  defp comment_kind(_), do: :pull_request_review

  defp ensure_comment_type_default(cs) do
    case get_change(cs, :comment_type) || get_field(cs, :comment_type) do
      t when t in [nil, ""] -> put_change(cs, :comment_type, "pull_request_review")
      _ -> cs
    end
  end
end
