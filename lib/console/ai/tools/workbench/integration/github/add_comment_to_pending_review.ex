defmodule Console.AI.Tools.Workbench.Integration.Github.AddCommentToPendingReview do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  import Tentacat

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GithubConnection}
  alias Console.AI.Tools.Workbench.Integration.Github.{Client, Response}

  embedded_schema do
    field :tool,      :map, virtual: true
    field :owner,     :string
    field :repo,      :string
    field :pull_number, :integer
    field :commit_id, :string
    field :event,     :string
    field :comments,  {:array, :map}
  end

  @json_schema Console.priv_file!("tools/workbench/integration/github/add_comment_to_pending_review.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "github_#{n}_add_comment_to_pending_review"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "Create or extend a pending PR review (#{n}) via GitHub REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:owner, :repo, :pull_number, :commit_id, :event, :comments])
    |> validate_required([:owner, :repo, :pull_number])
  end

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}}} = m) do
    with {:ok, client} <- Client.build(m.tool) do
      %{}
      |> maybe_put(m.commit_id, "commit_id")
      |> maybe_put(m.event, "event")
      |> maybe_comments(m.comments)
      |> then(&post("repos/#{m.owner}/#{m.repo}/pulls/#{m.pull_number}/reviews", client, &1))
      |> Response.json()
    end
  end

  def implement(%__MODULE__{}), do: {:error, "GitHub is not configured for this workbench tool."}

  defp maybe_put(acc, nil, _), do: acc
  defp maybe_put(acc, v, k), do: Map.put(acc, k, v)

  defp maybe_comments(acc, nil), do: acc
  defp maybe_comments(acc, list) when is_list(list), do: Map.put(acc, "comments", list)
  defp maybe_comments(acc, _), do: acc
end
