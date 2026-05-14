defmodule Console.AI.Tools.Workbench.Integration.Bitbucket.CreateComment do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  import EctoEnum

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.BitbucketConnection}
  alias Console.AI.Tools.Workbench.Integration.Bitbucket.Client

  defenum Resource,
    pull_request: 0,
    issue: 1

  embedded_schema do
    field :tool, :map, virtual: true
    field :repository, :string
    field :resource, Resource
    field :resource_id, :integer
    field :body, :string
    field :parent_comment_id, :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/bitbucket/create_comment.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "bitbucket_#{n}_create_comment"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "Post a comment on a Bitbucket Cloud pull request or repository issue (#{n}) via REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:repository, :resource, :resource_id, :body, :parent_comment_id])
    |> validate_required([:repository, :resource, :resource_id, :body])
  end

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{bitbucket: %BitbucketConnection{}}}} = m) do
    with {:ok, client} <- Client.build(m.tool),
         {:ok, workspace, repo_slug} <- Client.parse_repository(m.repository),
         path <- comment_path(workspace, repo_slug, m.resource, m.resource_id),
         body_map <- comment_payload(m),
         {:ok, created} <- Client.post_json(client, path, body_map) do
      Jason.encode(created)
    end
  end

  def implement(%__MODULE__{}), do: {:error, "Bitbucket Cloud is not configured for this workbench tool."}

  defp comment_path(workspace, repo_slug, :pull_request, pr_id),
    do: Client.repo_path(workspace, repo_slug) <> "/pullrequests/#{pr_id}/comments"

  defp comment_path(workspace, repo_slug, :issue, issue_id),
    do: Client.repo_path(workspace, repo_slug) <> "/issues/#{issue_id}/comments"

  defp comment_payload(%__MODULE__{body: text, parent_comment_id: nil}),
    do: %{"content" => %{"raw" => text}}

  defp comment_payload(%__MODULE__{body: text, parent_comment_id: parent}),
    do: %{"content" => %{"raw" => text}, "parent" => %{"id" => parent}}
end
