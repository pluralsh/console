defmodule Console.AI.Tools.Workbench.Integration.Bitbucket.ClosePullRequest do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.BitbucketConnection}
  alias Console.AI.Tools.Workbench.Integration.Bitbucket.Client

  embedded_schema do
    field :tool, :map, virtual: true
    field :repository, :string
    field :pull_request_id, :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/bitbucket/close_pull_request.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "bitbucket_#{n}_close_pull_request"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "Decline an open pull request without merging it (#{n}) via Bitbucket Cloud REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:repository, :pull_request_id])
    |> validate_required([:repository, :pull_request_id])
  end

  def implement(
        %__MODULE__{
          tool: %WorkbenchTool{configuration: %Configuration{bitbucket: %BitbucketConnection{}}},
          repository: repository,
          pull_request_id: pull_request_id
        } = m
      ) do
    with {:ok, client} <- Client.build(m.tool),
         {:ok, workspace, repo_slug} <- Client.parse_repository(repository),
         {:ok, declined} <-
           Client.post_json(
             client,
             "#{Client.repo_path(workspace, repo_slug)}/pullrequests/#{pull_request_id}/decline",
             %{}
           ) do
      Jason.encode(declined)
    end
  end

  def implement(%__MODULE__{}), do: {:error, "Bitbucket Cloud is not configured for this workbench tool."}
end
