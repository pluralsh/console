defmodule Console.AI.Tools.Workbench.Integration.BitbucketDatacenter.ReactToComment do
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
    field :comment_id, :integer
    field :emoticon, :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/bitbucket_datacenter/react_to_comment.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "bitbucket_datacenter_#{n}_react_to_comment"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do:
      "Add an emoji reaction to a pull request or issue comment (#{n}) via the comment-likes REST API (PUT .../reactions/{emoticon}). emoticon is a short name such as thumbsup, heart, smile, laughing (not Unicode). Issue reactions require server support for that path."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:project, :resource, :resource_id, :comment_id, :emoticon])
    |> validate_required([:project, :resource, :resource_id, :comment_id, :emoticon])
  end

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{bitbucket_datacenter: %BitbucketDatacenterConnection{}}}} = m) do
    with {:ok, client} <- Client.build(m.tool),
         {:ok, project_key, repo_slug} <- Client.parse_repository(m.project),
         url <-
           Client.reaction_url(
             client,
             project_key,
             repo_slug,
             m.resource,
             m.resource_id,
             m.comment_id,
             m.emoticon
           ),
         {:ok, result} <- Client.put_empty(client, url) do
      Jason.encode(result)
    end
  end

  def implement(%__MODULE__{}), do: {:error, "Bitbucket Data Center is not configured for this workbench tool."}
end
