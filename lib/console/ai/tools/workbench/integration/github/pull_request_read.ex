defmodule Console.AI.Tools.Workbench.Integration.Github.PullRequestRead do
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
    get_diff: 1,
    get_status: 2,
    get_files: 3,
    get_review_comments: 4,
    get_reviews: 5,
    get_comments: 6,
    get_check_runs: 7

  embedded_schema do
    field :tool,          :map, virtual: true
    field :owner,         :string
    field :repo,          :string
    field :pull_number,   :integer
    field :method,        Method
    field :page,          :integer
    field :per_page,      :integer
    field :after,         :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/github/pull_request_read.json")
               |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "github_#{n}_pull_request_read"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do: "Read pull request details, diff, checks, files, or comments (#{n}) via GitHub REST."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:owner, :repo, :pull_number, :method, :page, :per_page, :after])
    |> validate_required([:owner, :repo, :pull_number, :method])
  end

  def implement(
        %__MODULE__{
          tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}},
          method: :get
        } = m
      ) do
    with {:ok, client} <- GhClient.build(m.tool) do
      Tentacat.Pulls.find(client, m.owner, m.repo, m.pull_number)
      |> Response.json()
    end
  end

  def implement(
        %__MODULE__{
          tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}},
          method: :get_diff
        } = m
      ) do
    with {:ok, client} <- GhClient.build(m.tool) do
      path = "repos/#{m.owner}/#{m.repo}/pulls/#{m.pull_number}"

      case GhClient.plain_get(client, path, [{"Accept", "application/vnd.github.v3.diff"}]) do
        {:ok, body} ->
          Jason.encode(%{"diff" => body})

        {:error, msg} ->
          {:error, msg}
      end
    end
  end

  def implement(
        %__MODULE__{
          tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}},
          method: :get_status
        } = m
      ) do
    with {:ok, client} <- GhClient.build(m.tool) do
      case Tentacat.Pulls.find(client, m.owner, m.repo, m.pull_number) do
        {_, %{"head" => %{"sha" => sha}}, _} ->
          get("repos/#{m.owner}/#{m.repo}/commits/#{sha}/status", client)
          |> Response.json()

        other ->
          Response.json(other)
      end
    end
  end

  def implement(
        %__MODULE__{
          tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}},
          method: :get_files
        } = m
      ) do
    with {:ok, client} <- GhClient.build(m.tool) do
      m
      |> then(&Query.merge_optional(%{}, &1, [:page, :per_page]))
      |> Query.paginated()
      |> Query.stringify_params()
      |> then(
        &get(
          "repos/#{m.owner}/#{m.repo}/pulls/#{m.pull_number}/files#{Query.qp(&1)}",
          client,
          [],
          Query.manual_pagination()
        )
      )
      |> Response.json()
    end
  end

  def implement(
        %__MODULE__{
          tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}},
          method: :get_review_comments
        } = m
      ) do
    with {:ok, client} <- GhClient.build(m.tool) do
      m
      |> then(&Query.merge_optional(%{}, &1, [:page, :per_page, :after]))
      |> Query.paginated()
      |> Query.stringify_params()
      |> then(
        &get(
          "repos/#{m.owner}/#{m.repo}/pulls/#{m.pull_number}/comments#{Query.qp(&1)}",
          client,
          [],
          Query.manual_pagination()
        )
      )
      |> Response.json()
    end
  end

  def implement(
        %__MODULE__{
          tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}},
          method: :get_reviews
        } = m
      ) do
    with {:ok, client} <- GhClient.build(m.tool) do
      m
      |> then(&Query.merge_optional(%{}, &1, [:page, :per_page]))
      |> Query.paginated()
      |> Query.stringify_params()
      |> then(
        &get(
          "repos/#{m.owner}/#{m.repo}/pulls/#{m.pull_number}/reviews#{Query.qp(&1)}",
          client,
          [],
          Query.manual_pagination()
        )
      )
      |> Response.json()
    end
  end

  def implement(
        %__MODULE__{
          tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}},
          method: :get_comments
        } = m
      ) do
    with {:ok, client} <- GhClient.build(m.tool) do
      m
      |> then(&Query.merge_optional(%{}, &1, [:page, :per_page]))
      |> Query.paginated()
      |> Query.stringify_params()
      |> then(
        &get(
          "repos/#{m.owner}/#{m.repo}/issues/#{m.pull_number}/comments#{Query.qp(&1)}",
          client,
          [],
          Query.manual_pagination()
        )
      )
      |> Response.json()
    end
  end

  def implement(
        %__MODULE__{
          tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}},
          method: :get_check_runs
        } = m
      ) do
    with {:ok, client} <- GhClient.build(m.tool) do
      case Tentacat.Pulls.find(client, m.owner, m.repo, m.pull_number) do
        {_, %{"head" => %{"sha" => sha}}, _} ->
          m
          |> then(&Query.merge_optional(%{}, &1, [:page, :per_page]))
          |> Query.paginated()
          |> Query.stringify_params()
          |> then(
            &get(
              "repos/#{m.owner}/#{m.repo}/commits/#{sha}/check-runs#{Query.qp(&1)}",
              client,
              [],
              Query.manual_pagination()
            )
          )
          |> Response.json()

        other ->
          Response.json(other)
      end
    end
  end

  def implement(%__MODULE__{
        tool: %WorkbenchTool{configuration: %Configuration{github: %GithubConnection{}}}
      }) do
    {:error, "pull_request_read: unsupported method or missing fields"}
  end

  def implement(%__MODULE__{}), do: {:error, "GitHub is not configured for this workbench tool."}
end
