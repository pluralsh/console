defmodule Console.AI.Tools.Workbench.Integration.Github.ClosePullRequest do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GithubConnection}
  alias Console.AI.Tools.Workbench.Integration.Github.{Client, Response}

  embedded_schema do
    field :tool, :map, virtual: true
    field :owner, :string
    field :repo, :string
    field :pull_number, :integer
  end

  @json_schema Console.priv_file!("tools/workbench/integration/github/close_pull_request.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "github_#{n}_close_pull_request"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "Close an open pull request without merging it (#{n}) via GitHub REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:owner, :repo, :pull_number])
    |> validate_required([:owner, :repo, :pull_number])
  end

  def implement(
        %__MODULE__{
          tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}},
          owner: owner,
          repo: repo,
          pull_number: pull_number
        } = m
      ) do
    with {:ok, client} <- Client.build(m.tool) do
      Client.json_patch(client, "repos/#{owner}/#{repo}/pulls/#{pull_number}", %{"state" => "closed"})
      |> Response.json()
    end
  end

  def implement(%__MODULE__{}), do: {:error, "GitHub is not configured for this workbench tool."}
end
