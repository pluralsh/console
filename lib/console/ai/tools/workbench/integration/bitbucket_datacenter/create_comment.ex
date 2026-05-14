defmodule Console.AI.Tools.Workbench.Integration.BitbucketDatacenter.CreateComment do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  import EctoEnum

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.BitbucketDatacenterConnection}
  alias Console.AI.Tools.Workbench.Integration.BitbucketDatacenter.Client

  defenum Resource,
    pull_request: 0,
    issue: 1

  embedded_schema do
    field :tool, :map, virtual: true
    field :project, :string
    field :resource, Resource
    field :resource_id, :integer
    field :body, :string
    field :parent_comment_id, :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/bitbucket_datacenter/create_comment.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "bitbucket_datacenter_#{n}_create_comment"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do:
      "Post a comment on a Bitbucket Data Center pull request or repository issue (#{n}) via REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:project, :resource, :resource_id, :body, :parent_comment_id])
    |> validate_required([:project, :resource, :resource_id, :body])
  end

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{bitbucket_datacenter: %BitbucketDatacenterConnection{}}}} = m) do
    with {:ok, client} <- Client.build(m.tool),
         {:ok, project_key, repo_slug} <- Client.parse_repository(m.project),
         path <- comment_path(project_key, repo_slug, m.resource, m.resource_id),
         body_map <- comment_payload(m),
         {:ok, created} <- Client.post_json(client, path, body_map) do
      Jason.encode(created)
    end
  end

  def implement(%__MODULE__{}), do: {:error, "Bitbucket Data Center is not configured for this workbench tool."}

  defp comment_path(pk, slug, :pull_request, pr_id),
    do: "/projects/#{enc(pk)}/repos/#{enc(slug)}/pull-requests/#{pr_id}/comments"

  defp comment_path(pk, slug, :issue, issue_id),
    do: "/projects/#{enc(pk)}/repos/#{enc(slug)}/issues/#{issue_id}/comments"

  defp comment_payload(%__MODULE__{body: text, parent_comment_id: nil}),
    do: %{"text" => text, "severity" => "NORMAL", "state" => "OPEN"}

  defp comment_payload(%__MODULE__{body: text, parent_comment_id: parent}),
    do: %{
      "text" => text,
      "severity" => "NORMAL",
      "state" => "OPEN",
      "parent" => %{"id" => parent}
    }

  defp enc(s), do: URI.encode(s, &URI.char_unreserved?/1)
end
