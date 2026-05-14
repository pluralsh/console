defmodule Console.AI.Tools.Workbench.Integration.Gitlab.AwardEmojiOnNote do
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
    field :note_id, :integer
    field :name, :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/gitlab/award_emoji_on_note.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "gitlab_#{n}_award_emoji_on_note"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do:
      "Award an emoji reaction on a GitLab note (#{n}) for a merge request or issue (GitLab award emoji API); name is the emoji key (e.g. thumbs_up, eyes, rocket)."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:project, :resource, :iid, :note_id, :name])
    |> validate_required([:project, :resource, :iid, :note_id, :name])
  end

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{gitlab: %GitlabConnection{}}}} = m) do
    with {:ok, client} <- Client.build(m.tool),
         pid <- Client.encode_project_id(m.project),
         path <- award_path(pid, m.resource, m.iid, m.note_id),
         {:ok, created} <- Client.post(client, path, query: %{"name" => m.name}) do
      Jason.encode(created)
    end
  end

  def implement(%__MODULE__{}), do: {:error, "GitLab is not configured for this workbench tool."}

  defp award_path(pid, :merge_request, iid, note_id),
    do: "/projects/#{pid}/merge_requests/#{iid}/notes/#{note_id}/award_emoji"

  defp award_path(pid, :issue, iid, note_id),
    do: "/projects/#{pid}/issues/#{iid}/notes/#{note_id}/award_emoji"
end
