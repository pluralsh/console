defmodule Console.AI.Tools.Workbench.Integration.Gitlab.CloseMergeRequest do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GitlabConnection}
  alias Console.AI.Tools.Workbench.Integration.Gitlab.Client

  embedded_schema do
    field :tool, :map, virtual: true
    field :project, :string
    field :merge_request_iid, :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/gitlab/close_merge_request.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "gitlab_#{n}_close_merge_request"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "Close an open merge request without merging it (#{n}) via GitLab REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:project, :merge_request_iid])
    |> validate_required([:project, :merge_request_iid])
  end

  def implement(
        %__MODULE__{
          tool: %WorkbenchTool{configuration: %Configuration{gitlab: %GitlabConnection{}}},
          project: project,
          merge_request_iid: iid
        } = m
      ) do
    with {:ok, client} <- Client.build(m.tool),
         project_id <- Client.encode_project_id(project),
         {:ok, closed} <-
           Client.put(client, "/projects/#{project_id}/merge_requests/#{iid}", %{
             "state_event" => "close"
           }) do
      Jason.encode(closed)
    end
  end

  def implement(%__MODULE__{}), do: {:error, "GitLab is not configured for this workbench tool."}
end
