defmodule Console.AI.Tools.Workbench.Integration.AzureDevops.PullRequestRead do
  @moduledoc false

  use Console.AI.Tools.Workbench.Base

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.AzureDevopsConnection}
  alias Console.AI.Tools.Workbench.Integration.AzureDevops.Client

  embedded_schema do
    field :tool, :map, virtual: true
    field :organization, :string
    field :project, :string
    field :repository, :string
    field :pull_request_id, :integer
    field :include_threads, :boolean, default: false
  end

  @json_schema Console.priv_file!("tools/workbench/integration/azure_devops/pull_request_read.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: n}}), do: "azure_devops_#{n}_pull_request_read"

  def description(%__MODULE__{tool: %WorkbenchTool{name: n}}),
    do:
      "Fetch an Azure DevOps pull request (#{n}) by project, repository, and pull request id; optionally include comment threads (REST Git 7.1)."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(m, attrs) do
    m
    |> cast(attrs, [:organization, :project, :repository, :pull_request_id, :include_threads])
    |> validate_required([:project, :repository, :pull_request_id])
    |> default_include_threads()
  end

  defp default_include_threads(cs) do
    case get_field(cs, :include_threads) do
      nil -> put_change(cs, :include_threads, false)
      _ -> cs
    end
  end

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{azure_devops: %AzureDevopsConnection{}}}} = m) do
    with {:ok, client} <- Client.build(m.tool),
         {:ok, root} <- Client.project_api_root(client, m.organization, m.project) do
      repo = Client.encode_repo_id(m.repository)

      pr_url =
        "#{root}/_apis/git/repositories/#{repo}/pullRequests/#{m.pull_request_id}?#{URI.encode_query(%{"api-version" => "7.1"}, :safe)}"

      with {:ok, pr} <- Client.get_json(client, pr_url) do
        if m.include_threads do
          threads_url =
            "#{root}/_apis/git/repositories/#{repo}/pullRequests/#{m.pull_request_id}/threads?#{URI.encode_query(%{"api-version" => "7.1"}, :safe)}"

          with {:ok, threads} <- Client.get_json(client, threads_url) do
            Jason.encode(%{"pull_request" => pr, "threads" => threads})
          end
        else
          Jason.encode(pr)
        end
      end
    end
  end

  def implement(%__MODULE__{}), do: {:error, "Azure DevOps is not configured for this workbench tool."}
end
