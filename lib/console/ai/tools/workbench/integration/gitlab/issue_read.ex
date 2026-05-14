defmodule Console.AI.Tools.Workbench.Integration.Gitlab.IssueRead do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GitlabConnection}
  alias Console.AI.Tools.Workbench.Integration.Gitlab.{Client, Query}

  embedded_schema do
    field :tool, :map, virtual: true
    field :project, :string
    field :issue_iid, :integer
    field :include_notes, :boolean, default: false
    field :page, :integer
    field :per_page, :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/gitlab/issue_read.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "gitlab_#{n}_issue_read"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do:
      "Fetch a GitLab issue by project and IID (#{n}); optionally include notes (comments) with pagination."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:project, :issue_iid, :include_notes, :page, :per_page])
    |> validate_required([:project, :issue_iid])
    |> default_include_notes()
  end

  defp default_include_notes(cs) do
    case get_field(cs, :include_notes) do
      nil -> put_change(cs, :include_notes, false)
      _ -> cs
    end
  end

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{gitlab: %GitlabConnection{}}}} = m) do
    with {:ok, client} <- Client.build(m.tool),
         pid <- Client.encode_project_id(m.project),
         {:ok, issue} <- Client.get(client, "/projects/#{pid}/issues/#{m.issue_iid}") do
      if m.include_notes do
        query =
          %{}
          |> Query.merge_optional(m, [:page, :per_page])
          |> Query.stringify_params()

        with {:ok, notes} <-
               Client.get(client, "/projects/#{pid}/issues/#{m.issue_iid}/notes", query) do
          Jason.encode(%{"issue" => issue, "notes" => notes})
        end
      else
        Jason.encode(issue)
      end
    end
  end

  def implement(%__MODULE__{}), do: {:error, "GitLab is not configured for this workbench tool."}
end
