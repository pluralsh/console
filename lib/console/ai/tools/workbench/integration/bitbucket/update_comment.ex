defmodule Console.AI.Tools.Workbench.Integration.Bitbucket.UpdateComment do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  import EctoEnum

  alias Console.AI.Tools.Workbench.Integration.Bitbucket.Client
  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.BitbucketConnection}

  defenum Resource,
    pull_request: 0,
    issue: 1

  embedded_schema do
    field :tool, :map, virtual: true
    field :repository, :string
    field :resource, Resource
    field :resource_id, :integer
    field :comment_id, :integer
    field :body, :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/bitbucket/update_comment.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "bitbucket_#{n}_update_comment"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "Edit a Bitbucket Cloud pull request or repository issue comment (#{n}) via REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:repository, :resource, :resource_id, :comment_id, :body])
    |> validate_required([:repository, :resource, :resource_id, :comment_id, :body])
  end

  def implement(%__MODULE__{
        tool: %WorkbenchTool{configuration: %Configuration{bitbucket: %BitbucketConnection{}}}
      } = m) do
    with {:ok, client} <- Client.build(m.tool),
         {:ok, workspace, repo_slug} <- Client.parse_repository(m.repository),
         {:ok, updated} <-
           Client.put_json(
             client,
             comment_path(workspace, repo_slug, m.resource, m.resource_id, m.comment_id),
             %{"content" => %{"raw" => m.body}}
           ) do
      Jason.encode(updated)
    end
  end

  def implement(%__MODULE__{}), do: {:error, "Bitbucket Cloud is not configured for this workbench tool."}

  defp comment_path(workspace, repo_slug, :pull_request, pr_id, comment_id),
    do: Client.repo_path(workspace, repo_slug) <> "/pullrequests/#{pr_id}/comments/#{comment_id}"

  defp comment_path(workspace, repo_slug, :issue, issue_id, comment_id),
    do: Client.repo_path(workspace, repo_slug) <> "/issues/#{issue_id}/comments/#{comment_id}"
end
