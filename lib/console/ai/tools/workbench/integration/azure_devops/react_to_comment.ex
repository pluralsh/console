defmodule Console.AI.Tools.Workbench.Integration.AzureDevops.ReactToComment do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  import EctoEnum

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.AzureDevopsConnection}
  alias Console.AI.Tools.Workbench.Integration.AzureDevops.Client

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
    field :thread_id, :integer
    field :comment_id, :integer
    field :work_item_id, :integer
    field :reaction, :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/azure_devops/react_to_comment.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "azure_devops_#{n}_react_to_comment"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do:
      "React on an Azure DevOps comment (#{n}): like a pull request thread comment (Git likes API), or add a work item comment reaction (WIT reactions preview)."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:resource, :organization, :project, :repository, :pull_request_id, :thread_id, :comment_id, :work_item_id, :reaction])
    |> validate_required([:resource, :project, :comment_id, :reaction])
    |> validate_resource_fields()
    |> validate_reaction_for_resource()
  end

  defp validate_reaction_for_resource(cs) do
    case {get_field(cs, :resource), get_field(cs, :reaction)} do
      {:pull_request, r} when is_binary(r) ->
        if String.downcase(String.trim(r)) == "like",
          do: cs,
          else: add_error(cs, :reaction, "pull_request only supports reaction 'like'")

      _ ->
        cs
    end
  end

  defp validate_resource_fields(cs) do
    case get_field(cs, :resource) do
      :pull_request -> validate_required(cs, [:repository, :pull_request_id, :thread_id])
      :work_item -> validate_required(cs, [:work_item_id])
      _ -> cs
    end
  end

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{azure_devops: %AzureDevopsConnection{}}}} = m) do
    with {:ok, client} <- Client.build(m.tool),
         {:ok, root} <- Client.project_api_root(client, m.organization, m.project) do
      case m.resource do
        :pull_request ->
          if String.downcase(String.trim(m.reaction)) != "like" do
            {:error,
             "Pull request thread comments only support the 'like' reaction via the REST likes API; use resource work_item for other reaction types."}
          else
            repo = Client.encode_repo_id(m.repository)

            url =
              "#{root}/_apis/git/repositories/#{repo}/pullRequests/#{m.pull_request_id}/threads/#{m.thread_id}/comments/#{m.comment_id}/likes?#{URI.encode_query(%{"api-version" => "7.1"}, :safe)}"

            with {:ok, result} <- Client.post_empty(client, url) do
              Jason.encode(result)
            end
          end

        :work_item ->
          enc_reaction =
            m.reaction |> String.trim() |> String.downcase() |> Client.encode_path_segment()

          url =
            "#{root}/_apis/wit/workItems/#{m.work_item_id}/comments/#{m.comment_id}/reactions/#{enc_reaction}?#{URI.encode_query(%{"api-version" => "7.1-preview.1"}, :safe)}"

          with {:ok, result} <- Client.put_json(client, url, %{}) do
            Jason.encode(result)
          end
      end
    end
  end

  def implement(%__MODULE__{}), do: {:error, "Azure DevOps is not configured for this workbench tool."}
end
