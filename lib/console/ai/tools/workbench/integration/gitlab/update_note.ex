defmodule Console.AI.Tools.Workbench.Integration.Gitlab.UpdateNote do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  import EctoEnum

  alias Console.AI.Tools.Workbench.Integration.Gitlab.Client
  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GitlabConnection}

  defenum Resource,
    merge_request: 0,
    issue: 1

  embedded_schema do
    field :tool, :map, virtual: true
    field :project, :string
    field :resource, Resource
    field :iid, :integer
    field :note_id, :integer
    field :discussion_id, :string
    field :body, :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/gitlab/update_note.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "gitlab_#{n}_update_note"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "Edit a GitLab merge request or issue note, including a discussion note (#{n}) via REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:project, :resource, :iid, :note_id, :discussion_id, :body])
    |> validate_required([:project, :resource, :iid, :note_id, :body])
  end

  def implement(%__MODULE__{
        tool: %WorkbenchTool{configuration: %Configuration{gitlab: %GitlabConnection{}}}
      } = m) do
    with {:ok, client} <- Client.build(m.tool),
         pid <- Client.encode_project_id(m.project),
         {:ok, updated} <- Client.put_json(client, path(pid, m), %{"body" => m.body}) do
      Jason.encode(updated)
    end
  end

  def implement(%__MODULE__{}), do: {:error, "GitLab is not configured for this workbench tool."}

  defp path(pid, %__MODULE__{resource: resource, discussion_id: nil, iid: iid, note_id: note_id}),
    do: "/projects/#{pid}/#{resource_path(resource)}/#{iid}/notes/#{note_id}"

  defp path(pid, %__MODULE__{
         resource: resource,
         discussion_id: discussion_id,
         iid: iid,
         note_id: note_id
       }),
       do:
         "/projects/#{pid}/#{resource_path(resource)}/#{iid}/discussions/#{URI.encode_www_form(discussion_id)}/notes/#{note_id}"

  defp resource_path(:merge_request), do: "merge_requests"
  defp resource_path(:issue), do: "issues"
end
