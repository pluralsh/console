defmodule Console.AI.Tools.Workbench.Integration.AzureDevops.CreateComment do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  import EctoEnum

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.AzureDevopsConnection}
  alias Console.AI.Tools.Workbench.Integration.{AzureDevops.Client, Query}

  defenum Resource,
    pull_request: 0,
    work_item: 1

  embedded_schema do
    field :tool, :map, virtual: true
    field :resource, Resource
    field :organization, :string
    field :project, :string
    field :repository, :string
    field :pull_request_id, :integer
    field :work_item_id, :integer
    field :body, :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/azure_devops/create_comment.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "azure_devops_#{n}_create_comment"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do:
      "Post a comment on an Azure DevOps pull request (new thread) or work item (#{n}) via REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:resource, :organization, :project, :repository, :pull_request_id, :work_item_id, :body])
    |> validate_required([:resource, :project, :body])
    |> validate_resource_fields()
  end

  defp validate_resource_fields(cs) do
    case get_field(cs, :resource) do
      :pull_request -> validate_required(cs, [:repository, :pull_request_id])
      :work_item -> validate_required(cs, [:work_item_id])
      _ -> cs
    end
  end

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{azure_devops: %AzureDevopsConnection{}}}} = m) do
    with {:ok, client} <- Client.build(m.tool),
         {:ok, root} <- Client.project_api_root(client, m.organization, m.project) do
      case m.resource do
        :pull_request ->
          repo = Client.encode_repo_id(m.repository)

          url =
            "#{root}/_apis/git/repositories/#{repo}/pullRequests/#{m.pull_request_id}/threads#{Query.query_string(%{"api-version" => "7.1"})}"

          body = %{
            "comments" => [
              %{
                "parentCommentId" => 0,
                "content" => m.body,
                "commentType" => 1
              }
            ],
            "status" => 1
          }

          with {:ok, created} <- Client.post_json(client, url, body) do
            Jason.encode(created)
          end

        :work_item ->
          url =
            "#{root}/_apis/wit/workItems/#{m.work_item_id}/comments#{Query.query_string(%{"api-version" => "7.0-preview.3"})}"

          with {:ok, created} <- Client.post_json(client, url, %{"text" => m.body}) do
            Jason.encode(created)
          end
      end
    end
  end

  def implement(%__MODULE__{}), do: {:error, "Azure DevOps is not configured for this workbench tool."}
end
