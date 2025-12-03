defmodule Console.Deployments.Pr.Impl.BitBucketDatacenter do
  import Console.Deployments.Pr.Utils
  import Console.Deployments.Pr.Git, only: [sha: 2]
  alias Console.Schema.{PullRequest, ScmConnection, PrAutomation}
  require Logger

  @behaviour Console.Deployments.Pr.Dispatcher

  defmodule Connection do
    defstruct [:host, :password, :username]

    def new(host, username, password), do: {:ok, %__MODULE__{host: host, username: username, password: password}}

    def headers(%__MODULE__{username: username, password: password}) do
      [
        {"Authorization", "Basic #{Base.encode64("#{username}:#{password}")}"},
        {"Content-Type", "application/json"},
        {"Accept", "application/json;charset=UTF-8"}
      ]
    end
  end

  def create(pr, branch, ctx, _labels \\ []) do
    with {:ok, conn} <- connection(pr),
         {:ok, project, slug} <- parse_identifier(pr.identifier),
         {:ok, title, body} <- description(pr, ctx) do
      base_branch = pr.branch || "master"
      post(conn, "/projects/#{project}/repos/#{slug}/pull-requests", %{
        fromRef: %{
          displayId: branch,
          id: "refs/heads/#{branch}",
          latestCommit: sha(conn, branch)
        },
        toRef: %{
          displayId: base_branch,
          id: "refs/heads/#{base_branch}",
          latestCommit: sha(conn, base_branch)
        },
        title: title,
        description: body,
      })
      |> case do
        {:ok, %{"id" => id} = mr} ->
          {:ok, %{
            title: title,
            ref: branch,
            body: body,
            url: to_url(conn, project, slug, id),
            owner: owner(mr)
          }}
        err -> err
      end
    end
  end

  def webhook(_, _), do: :ok

  def pr(%{"pullrequest" => %{"links" => %{"html" => %{"href" => url}}} = pr}) do
    attrs = Map.merge(%{
      status: state(pr),
      ref: pr["source"]["branch"]["name"],
      title: pr["title"],
      body: pr["summary"]["raw"]
    }, pr_associations(pr_content(pr)))
    |> Console.drop_nils()

    {:ok, url, attrs}
  end
  def pr(_), do: :ignore

  defp pr_content(pr), do: "#{pr["fromRef"]["displayId"]}\n#{pr["title"]}\n#{pr["description"]}"

  def review(conn, %PullRequest{url: url}, body) do
    with {:ok, project, slug, number} <- get_pull_id(url),
         {:ok, conn} <- connection(conn) do
      case post(conn, Path.join(["/projects", project, "repos", slug, "pull-requests", number, "comments"]), %{
        severity: "NORMAL",
        state: "OPEN",
        text: filter_ansi(body),
      }) do
        {:ok, %{"id" => id}} -> {:ok, "#{id}"}
        err -> err
      end
    end
  end

  def files(_, _), do: {:ok, []}

  def approve(_, _, _), do: {:error, "not implemented"}

  def slug(url) do
    with %URI{path: "/scm/" <> path} <- URI.parse(url),
         [owner, repo | _] <- String.split(path, "/") do
      {:ok, "#{owner}/#{String.trim_trailing(repo, ".git")}"}
    else
      _ -> {:error, "could not parse bitbucket url"}
    end
  end

  def commit_status(_, _, _, _, _), do: :ok

  def merge(_, _), do: :ok

  def pr_info(url) do
    with {:ok, project, repo, number} <- get_pull_id(url),
      do: {:ok, %{project: project, repo: repo, number: number}}
  end

  defp post(conn, path, body) do
    url(conn, path)
    |> HTTPoison.post(Jason.encode!(body), Connection.headers(conn))
    |> handle_response()
  end

  defp handle_response({:ok, %HTTPoison.Response{status_code: code, body: body}})
    when code >= 200 and code < 300, do: Jason.decode(body)
  defp handle_response({:ok, %HTTPoison.Response{body: body}}), do: {:error, "bitbucket request failed: #{body}"}
  defp handle_response(_), do: {:error, "unknown bitbucket error"}

  defp state(%{"state" => "MERGED"}), do: :merged
  defp state(%{"state" => "DECLINED"}), do: :closed
  defp state(%{"state" => "SUPERSEDED"}), do: :closed
  defp state(_), do: :open

  defp owner(%{"author" => %{"user" => %{"emailAddress" => email}}}), do: email
  defp owner(_), do: nil

  defp url(%Connection{host: host}, path) when is_binary(host) do
    host = String.trim_trailing(host, "/rest/api/latest")
    Path.join([host, "rest/api/latest", path])
  end

  defp connection(%PrAutomation{connection: %ScmConnection{} = conn}), do: connection(conn)
  defp connection(%ScmConnection{api_url: url, username: username, token: password})
    when is_binary(username) and is_binary(password) and is_binary(url), do: {:ok, Connection.new(url, username, password)}
  defp connection(%ScmConnection{base_url: url, username: username, token: password})
    when is_binary(username) and is_binary(password) and is_binary(url), do: {:ok, Connection.new(url, username, password)}
  defp connection(_),
    do: {:error, "Bitbucket datacenter connection improperly configured, must include a username and password and either a base url or api url"}

  defp parse_identifier(%PrAutomation{identifier: identifier}), do: parse_identifier(identifier)
  defp parse_identifier(identifier) when is_binary(identifier) do
    case String.split(identifier, "/") do
      [project, slug] -> {:ok, project, slug}
      _ -> {:error, "could not parse bitbucket datacenter identifier: #{identifier}, should be in format <project>/<slug>"}
    end
  end

  defp get_pull_id(url) do
    with %URI{path: "/" <> path} <- URI.parse(url),
         [workspace, repo, "pull-requests", pr_id] <- String.split(path, "/") do
      {:ok, workspace, repo, pr_id}
    else
      _ -> {:error, "could not parse bitbucket url"}
    end
  end

  defp to_url(%Connection{host: host}, project, slug, id) do
    host = String.trim_trailing(host, "/rest/api/latest")
    Path.join([host, "projects", project, "repos", slug, "pull-requests", id])
  end
end
