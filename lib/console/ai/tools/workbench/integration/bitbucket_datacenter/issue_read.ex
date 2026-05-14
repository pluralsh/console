defmodule Console.AI.Tools.Workbench.Integration.BitbucketDatacenter.IssueRead do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.BitbucketDatacenterConnection}
  alias Console.AI.Tools.Workbench.Integration.BitbucketDatacenter.{Client, Query}

  embedded_schema do
    field :tool, :map, virtual: true
    field :project, :string
    field :issue_id, :integer
    field :include_comments, :boolean, default: false
    field :start, :integer
    field :limit, :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/bitbucket_datacenter/issue_read.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "bitbucket_datacenter_#{n}_issue_read"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do:
      "Fetch a Bitbucket Data Center repository issue by numeric id (#{n}); optionally include paged comments. Requires the repository issue tracker to be enabled."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:project, :issue_id, :include_comments, :start, :limit])
    |> validate_required([:project, :issue_id])
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
         path <- issue_path(project_key, repo_slug, m.issue_id),
         {:ok, issue} <- Client.get(client, path) do
      if m.include_comments do
        cpath = path <> "/comments"
        query = Query.merge_optional(%{}, m, [:start, :limit])

        with {:ok, comments} <- Client.get(client, cpath, query) do
          Jason.encode(%{"issue" => issue, "comments" => comments})
        end
      else
        Jason.encode(issue)
      end
    end
  end

  def implement(%__MODULE__{}), do: {:error, "Bitbucket Data Center is not configured for this workbench tool."}

  defp issue_path(project_key, repo_slug, id),
    do: "/projects/#{enc(project_key)}/repos/#{enc(repo_slug)}/issues/#{id}"

  defp enc(s), do: URI.encode(s, &URI.char_unreserved?/1)
end
