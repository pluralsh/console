defmodule Console.AI.Tools.Workbench.Integration.Gitlab.CreateNote do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  import EctoEnum

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GitlabConnection}
  alias Console.AI.Tools.Workbench.Integration.Gitlab.Client

  defenum Resource,
    merge_request: 0,
    issue: 1

  embedded_schema do
    field :tool, :map, virtual: true
    field :project, :string
    field :resource, Resource
    field :iid, :integer
    field :body, :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/gitlab/create_note.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "gitlab_#{n}_create_note"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "Post a new note (comment) on a GitLab merge request or issue (#{n}) via REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:project, :resource, :iid, :body])
    |> validate_required([:project, :resource, :iid, :body])
  end

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{gitlab: %GitlabConnection{}}}} = m) do
    with {:ok, client} <- Client.build(m.tool),
         pid <- Client.encode_project_id(m.project),
         path <- note_path(pid, m.resource, m.iid),
         {:ok, created} <- Client.post_json(client, path, %{"body" => m.body}) do
      Jason.encode(created)
    end
  end

  def implement(%__MODULE__{}), do: {:error, "GitLab is not configured for this workbench tool."}

  defp note_path(pid, :merge_request, iid), do: "/projects/#{pid}/merge_requests/#{iid}/notes"
  defp note_path(pid, :issue, iid), do: "/projects/#{pid}/issues/#{iid}/notes"
end
