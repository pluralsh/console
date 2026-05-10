defmodule Console.AI.Tools.Workbench.Integration.Github.IssueRead do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  import EctoEnum
  import Tentacat

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GithubConnection}
  alias Console.AI.Tools.Workbench.Integration.Github.{Response, Query}
  alias Console.AI.Tools.Workbench.Integration.Github.Client, as: GhClient

  defenum Method,
    get: 0,
    get_comments: 1,
    get_labels: 2,
    get_sub_issues: 3

  embedded_schema do
    field :tool,          :map, virtual: true
    field :owner,         :string
    field :repo,          :string
    field :issue_number,  :integer
    field :method,        Method
    field :page,          :integer
    field :per_page,      :integer
    field :after,         :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/github/issue_read.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "github_#{n}_issue_read"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "Read issue details, comments, labels, or sub-issues (#{n}) via GitHub REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:owner, :repo, :issue_number, :method, :page, :per_page, :after])
    |> validate_required([:owner, :repo, :issue_number, :method])
  end

  def implement(%__MODULE__{
        tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}},
        method: :get
      } = m) do
    with {:ok, client} <- GhClient.build(m.tool) do
      Tentacat.Issues.find(client, m.owner, m.repo, m.issue_number)
      |> Response.json()
    end
  end

  def implement(%__MODULE__{
        tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}},
        method: :get_comments
      } = m) do
    with {:ok, client} <- GhClient.build(m.tool) do
      m
      |> then(&Query.merge_optional(%{}, &1, [:page, :per_page]))
      |> Query.stringify_params()
      |> then(&get("repos/#{m.owner}/#{m.repo}/issues/#{m.issue_number}/comments#{Query.qp(&1)}", client))
      |> Response.json()
    end
  end

  def implement(%__MODULE__{
        tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}},
        method: :get_labels
      } = m) do
    with {:ok, client} <- GhClient.build(m.tool) do
      case Tentacat.Issues.find(client, m.owner, m.repo, m.issue_number) do
        {s, %{"labels" => _} = issue, _} when s >= 200 and s < 300 ->
          Jason.encode(Map.take(issue, ["labels"]))

        other ->
          Response.json(other)
      end
    end
  end

  def implement(%__MODULE__{
        tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}},
        method: :get_sub_issues
      } = m) do
    with {:ok, client} <- GhClient.build(m.tool) do
      m
      |> then(&Query.merge_optional(%{}, &1, [:page, :per_page, :after]))
      |> Query.stringify_params()
      |> then(&"repos/#{m.owner}/#{m.repo}/issues/#{m.issue_number}/sub_issues#{Query.qp(&1)}")
      |> then(&fetch_sub_issues(client, &1))
    end
  end

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}}}) do
    {:error, "issue_read: unsupported method or missing fields"}
  end

  def implement(%__MODULE__{}), do: {:error, "GitHub is not configured for this workbench tool."}

  defp fetch_sub_issues(client, path) do
    url = client.endpoint <> path

    headers =
      authorization_header(client.auth, [
        {"Accept", "application/vnd.github+json"},
        {"X-GitHub-Api-Version", "2022-11-28"},
        {"User-agent", "tentacat"}
      ])

    req_headers = Application.get_env(:tentacat, :extra_headers, []) ++ headers

    case raw_request(:get, url, "", req_headers, client.request_options || []) do
      {s, body, _} when s >= 200 and s < 300 ->
        Jason.encode(body)

      {s, body, _} ->
        {:error, "GitHub API #{s}: #{inspect(body)}"}

      other ->
        {:error, inspect(other)}
    end
  end
end
