defmodule Console.AI.Tools.Workbench.Integration.BitbucketDatacenter.PullRequestRead do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.BitbucketDatacenterConnection}
  alias Console.AI.Tools.Workbench.Integration.BitbucketDatacenter.{Client, Query}

  embedded_schema do
    field :tool, :map, virtual: true
    field :project, :string
    field :pull_request_id, :integer
    field :include_comments, :boolean, default: false
    field :start, :integer
    field :limit, :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/bitbucket_datacenter/pull_request_read.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "bitbucket_datacenter_#{n}_pull_request_read"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do:
      "Fetch a Bitbucket Data Center pull request by numeric id (#{n}); optionally include paged comments (REST /pull-requests/{id}/comments)."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:project, :pull_request_id, :include_comments, :start, :limit])
    |> validate_required([:project, :pull_request_id])
    |> default_include_comments()
  end

  defp default_include_comments(cs) do
    case get_field(cs, :include_comments) do
      nil -> put_change(cs, :include_comments, false)
      _ -> cs
    end
  end

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{bitbucket_datacenter: %BitbucketDatacenterConnection{}}}} = m) do
    with {:ok, client} <- Client.build(m.tool),
         {:ok, project_key, repo_slug} <- Client.parse_repository(m.project),
         path <- pr_path(project_key, repo_slug, m.pull_request_id),
         {:ok, pr} <- Client.get(client, path) do
      if m.include_comments do
        cpath = path <> "/comments"

        query =
          %{}
          |> Query.merge_optional(m, [:start, :limit])

        with {:ok, comments} <- Client.get(client, cpath, query) do
          Jason.encode(%{"pull_request" => pr, "comments" => comments})
        end
      else
        Jason.encode(pr)
      end
    end
  end

  def implement(%__MODULE__{}), do: {:error, "Bitbucket Data Center is not configured for this workbench tool."}

  defp pr_path(project_key, repo_slug, id),
    do: "/projects/#{enc(project_key)}/repos/#{enc(repo_slug)}/pull-requests/#{id}"

  defp enc(s), do: URI.encode(s, &URI.char_unreserved?/1)
end
