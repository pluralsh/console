defmodule Console.AI.Tools.Workbench.Integration.Github.AddIssueComment do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GithubConnection}
  alias Console.AI.Tools.Workbench.Integration.Github.{Client, Response}

  embedded_schema do
    field :tool,          :map, virtual: true
    field :owner,         :string
    field :repo,          :string
    field :issue_number,  :integer
    field :body,          :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/github/add_issue_comment.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "github_#{n}_add_issue_comment"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "Add a comment to an issue (#{n}) via GitHub REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:owner, :repo, :issue_number, :body])
    |> validate_required([:owner, :repo, :issue_number, :body])
  end

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}}} = m) do
    with {:ok, client} <- Client.build(m.tool) do
      %{"body" => m.body}
      |> then(&Tentacat.Issues.Comments.create(client, m.owner, m.repo, m.issue_number, &1))
      |> Response.json()
    end
  end

  def implement(%__MODULE__{}), do: {:error, "GitHub is not configured for this workbench tool."}
end
