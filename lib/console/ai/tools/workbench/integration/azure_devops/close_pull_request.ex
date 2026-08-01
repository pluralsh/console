defmodule Console.AI.Tools.Workbench.Integration.AzureDevops.ClosePullRequest do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.AzureDevopsConnection}
  alias Console.AI.Tools.Workbench.Integration.{AzureDevops.Client, Query}

  embedded_schema do
    field :tool, :map, virtual: true
    field :organization, :string
    field :project, :string
    field :repository, :string
    field :pull_request_id, :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/azure_devops/close_pull_request.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "azure_devops_#{n}_close_pull_request"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "Abandon an open pull request without merging it (#{n}) via Azure DevOps REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:organization, :project, :repository, :pull_request_id])
    |> validate_required([:project, :repository, :pull_request_id])
  end

  def implement(
        %__MODULE__{
          tool: %WorkbenchTool{configuration: %Configuration{azure_devops: %AzureDevopsConnection{}}},
          organization: organization,
          project: project,
          repository: repository,
          pull_request_id: pull_request_id
        } = m
      ) do
    with {:ok, client} <- Client.build(m.tool),
         {:ok, root} <- Client.project_api_root(client, organization, project),
         repository <- Client.encode_repo_id(repository),
         {:ok, abandoned} <-
           Client.patch_json(
             client,
             "#{root}/_apis/git/repositories/#{repository}/pullRequests/#{pull_request_id}#{Query.query_string(%{"api-version" => "7.1"})}",
             %{"status" => "abandoned"}
           ) do
      Jason.encode(abandoned)
    end
  end

  def implement(%__MODULE__{}), do: {:error, "Azure DevOps is not configured for this workbench tool."}
end
