defmodule Console.AI.Tools.Workbench.Integration.BitbucketDatacenter.UpdateComment do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  import EctoEnum

  alias Console.AI.Tools.Workbench.Integration.BitbucketDatacenter.Client
  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.BitbucketDatacenterConnection}

  defenum Resource,
    pull_request: 0,
    issue: 1

  embedded_schema do
    field :tool, :map, virtual: true
    field :project, :string
    field :resource, Resource
    field :resource_id, :integer
    field :comment_id, :integer
    field :version, :integer
    field :body, :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/bitbucket_datacenter/update_comment.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "bitbucket_datacenter_#{n}_update_comment"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "Edit a Bitbucket Data Center pull request or repository issue comment (#{n}) via REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:project, :resource, :resource_id, :comment_id, :version, :body])
    |> validate_required([:project, :resource, :resource_id, :comment_id, :version, :body])
  end

  def implement(%__MODULE__{
        tool:
          %WorkbenchTool{
            configuration: %Configuration{
              bitbucket_datacenter: %BitbucketDatacenterConnection{}
            }
          }
      } = m) do
    with {:ok, client} <- Client.build(m.tool),
         {:ok, project_key, repo_slug} <- Client.parse_repository(m.project),
         {:ok, updated} <-
           Client.put_json(
             client,
             comment_path(project_key, repo_slug, m.resource, m.resource_id, m.comment_id),
             %{"text" => m.body, "version" => m.version}
           ) do
      Jason.encode(updated)
    end
  end

  def implement(%__MODULE__{}),
    do: {:error, "Bitbucket Data Center is not configured for this workbench tool."}

  defp comment_path(pk, slug, :pull_request, pr_id, comment_id),
    do: "/projects/#{enc(pk)}/repos/#{enc(slug)}/pull-requests/#{pr_id}/comments/#{comment_id}"

  defp comment_path(pk, slug, :issue, issue_id, comment_id),
    do: "/projects/#{enc(pk)}/repos/#{enc(slug)}/issues/#{issue_id}/comments/#{comment_id}"

  defp enc(s), do: URI.encode(s, &URI.char_unreserved?/1)
end
