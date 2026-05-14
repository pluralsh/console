defmodule Console.AI.Tools.Workbench.Integration.Bitbucket.PullRequestRead do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.BitbucketConnection}
  alias Console.AI.Tools.Workbench.Integration.Bitbucket.{Client, Query}

  embedded_schema do
    field :tool, :map, virtual: true
    field :repository, :string
    field :pull_request_id, :integer
    field :include_comments, :boolean, default: false
    field :page, :integer
    field :pagelen, :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/bitbucket/pull_request_read.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "bitbucket_#{n}_pull_request_read"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do:
      "Fetch a Bitbucket Cloud pull request by repository and id (#{n}); optionally include paged comments."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:repository, :pull_request_id, :include_comments, :page, :pagelen])
    |> validate_required([:repository, :pull_request_id])
    |> default_include_comments()
  end

  defp default_include_comments(cs) do
    case get_field(cs, :include_comments) do
      nil -> put_change(cs, :include_comments, false)
      _ -> cs
    end
  end

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{bitbucket: %BitbucketConnection{}}}} = m) do
    with {:ok, client} <- Client.build(m.tool),
         {:ok, workspace, repo_slug} <- Client.parse_repository(m.repository),
         path <- Client.repo_path(workspace, repo_slug) <> "/pullrequests/#{m.pull_request_id}",
         {:ok, pr} <- Client.get(client, path) do
      if m.include_comments do
        query =
          %{}
          |> Query.merge_optional(m, [:page, :pagelen])

        with {:ok, comments} <- Client.get(client, path <> "/comments", query) do
          Jason.encode(%{"pull_request" => pr, "comments" => comments})
        end
      else
        Jason.encode(pr)
      end
    end
  end

  def implement(%__MODULE__{}), do: {:error, "Bitbucket Cloud is not configured for this workbench tool."}
end
