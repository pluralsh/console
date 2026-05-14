defmodule Console.AI.Tools.Workbench.Integration.AzureDevops.WorkItemRead do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.AzureDevopsConnection}
  alias Console.AI.Tools.Workbench.Integration.AzureDevops.Client

  embedded_schema do
    field :tool, :map, virtual: true
    field :organization, :string
    field :project, :string
    field :work_item_id, :integer
    field :include_comments, :boolean, default: false
  end

  @json_schema Console.priv_file!("tools/workbench/integration/azure_devops/work_item_read.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "azure_devops_#{n}_work_item_read"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do:
      "Fetch an Azure DevOps work item (#{n}) by id (issue/task/bug etc.); optionally include discussion comments (REST WIT 7.1 / comments preview)."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:organization, :project, :work_item_id, :include_comments])
    |> validate_required([:project, :work_item_id])
    |> default_include_comments()
  end

  defp default_include_comments(cs) do
    case get_field(cs, :include_comments) do
      nil -> put_change(cs, :include_comments, false)
      _ -> cs
    end
  end

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{azure_devops: %AzureDevopsConnection{}}}} = m) do
    with {:ok, client} <- Client.build(m.tool),
         {:ok, root} <- Client.project_api_root(client, m.organization, m.project) do
      wi_url =
        "#{root}/_apis/wit/workItems/#{m.work_item_id}?#{URI.encode_query(%{"api-version" => "7.1"}, :safe)}"

      with {:ok, work_item} <- Client.get_json(client, wi_url) do
        if m.include_comments do
          comments_url =
            "#{root}/_apis/wit/workItems/#{m.work_item_id}/comments?#{URI.encode_query(%{"api-version" => "7.0-preview.3"}, :safe)}"

          with {:ok, comments} <- Client.get_json(client, comments_url) do
            Jason.encode(%{"work_item" => work_item, "comments" => comments})
          end
        else
          Jason.encode(work_item)
        end
      end
    end
  end

  def implement(%__MODULE__{}), do: {:error, "Azure DevOps is not configured for this workbench tool."}
end
