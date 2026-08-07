defmodule Console.AI.Tools.Workbench.Integration.AzureDevops.UpdateComment do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  import EctoEnum

  alias Console.AI.Tools.Workbench.Integration.{AzureDevops.Client, Query}
  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.AzureDevopsConnection}

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
    field :thread_id, :integer
    field :comment_id, :integer
    field :body, :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/azure_devops/update_comment.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "azure_devops_#{n}_update_comment"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "Edit an Azure DevOps pull request thread or work item comment (#{n}) via REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [
      :resource,
      :organization,
      :project,
      :repository,
      :pull_request_id,
      :work_item_id,
      :thread_id,
      :comment_id,
      :body
    ])
    |> validate_required([:resource, :project, :comment_id, :body])
    |> validate_resource_fields()
  end

  def implement(%__MODULE__{
        tool: %WorkbenchTool{configuration: %Configuration{azure_devops: %AzureDevopsConnection{}}}
      } = m) do
    with {:ok, client} <- Client.build(m.tool),
         {:ok, root} <- Client.project_api_root(client, m.organization, m.project),
         {:ok, updated} <- Client.patch_json(client, path(root, m), payload(m)) do
      Jason.encode(updated)
    end
  end

  def implement(%__MODULE__{}), do: {:error, "Azure DevOps is not configured for this workbench tool."}

  defp validate_resource_fields(changeset) do
    case get_field(changeset, :resource) do
      :pull_request ->
        validate_required(changeset, [:repository, :pull_request_id, :thread_id])

      :work_item ->
        validate_required(changeset, [:work_item_id])

      _ ->
        changeset
    end
  end

  defp path(root, %__MODULE__{
         resource: :pull_request,
         repository: repository,
         pull_request_id: pull_request_id,
         thread_id: thread_id,
         comment_id: comment_id
       }) do
    repo = Client.encode_repo_id(repository)

    "#{root}/_apis/git/repositories/#{repo}/pullRequests/#{pull_request_id}/threads/#{thread_id}/comments/#{comment_id}" <>
      Query.query_string(%{"api-version" => "7.1"})
  end

  defp path(root, %__MODULE__{resource: :work_item, work_item_id: work_item_id, comment_id: comment_id}),
    do:
      "#{root}/_apis/wit/workItems/#{work_item_id}/comments/#{comment_id}" <>
        Query.query_string(%{"api-version" => "7.1-preview.4"})

  defp payload(%__MODULE__{resource: :pull_request, body: body}), do: %{"content" => body}
  defp payload(%__MODULE__{resource: :work_item, body: body}), do: %{"text" => body}
end
