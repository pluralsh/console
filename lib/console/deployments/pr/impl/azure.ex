defmodule Console.Deployments.Pr.Impl.Azure do
  import Console.Deployments.Pr.Utils
  alias Console.Schema.{
    ScmConnection,
    PrAutomation,
    PullRequest
  }

  @behaviour Console.Deployments.Pr.Dispatcher

  defmodule Connection do
    defstruct [:host, :token, :username, :organization, :project]
    alias Console.Schema.ScmConnection

    @devops_host "https://dev.azure.com"

    def new(token, %ScmConnection.Azure{username: username, organization: org, project: project}) do
      {:ok, %__MODULE__{
        host: @devops_host,
        token: token,
        username: username,
        organization: org,
        project: project
      }}
    end

    def headers(%__MODULE__{token: token, username: username}) do
      [
        {"Authorization", "Basic #{Base.encode64("#{username}:#{token}")}"},
        {"Content-Type", "application/json"},
        {"Accept", "application/json"}
      ]
    end
  end

  def create(pra, branch, ctx) do
    name = URI.encode(pra.identifier)
    with {:ok, conn} <- connection(pra),
         {:ok, title, body} <- description(pra, ctx),
         {:ok, id} <- get_repo_id(conn, name) do
      post(conn, "/git/repositories/#{id}/pullrequests", %{
        sourceRefName: "refs/heads/#{branch}",
        targetRefName: "refs/heads/#{pra.branch || "main"}",
        title: title,
        description: body,
      })
      |> case do
        {:ok, pr} -> {:ok, %{title: title, ref: branch, body: body, url: web_url(pr), owner: owner(pr)}}
        err -> err
      end
    end
  end

  def webhook(_, _), do: {:error, "not implemented"}

  def pr(%{"eventType" => "git.pullrequest" <> _, "resource" => pr}) do
    url = web_url(pr)
    attrs = Map.merge(%{
      status: state(pr),
      ref: pr["sourceRefName"],
      title: pr["title"],
      body: pr["description"],
      commit_sha: get_in(pr, ["lastMergeCommit", "commitId"])
    }, pr_associations(pr_content(pr)))
    |> Console.drop_nils()

    {:ok, url, attrs}
  end
  def pr(_), do: :ignore

  def review(conn, %PullRequest{url: url} = pr, body) do
    with {:ok, name, number} <- get_pull_id(url),
         {:ok, conn} <- connection(conn),
         {:ok, repo_id} <- get_repo_id(conn, name) do
      case pr do
        %PullRequest{comment_id: id} when is_binary(id) ->
          update_existing_comment(conn, repo_id, number, id, body)
        _ ->
          post_new_comment(conn, repo_id, number, body)
      end
    end
  end

  def approve(_, _, _), do: {:error, "not implemented"}

  def files(_, _), do: {:ok, []}

  def commit_status(_, _, _, _, _), do: :ok

  def pr_info(url) do
    with {:ok, repo_id, number} <- get_pull_id(url) do
      {:ok, %{repoId: repo_id, number: number}}
    end
  end

  def slug(url) do
    with %URI{path: "/" <> path} <- URI.parse(url),
         [_, repo] <- String.split(path, "/_git/") do
      {:ok, repo}
    else
      _ -> {:error, "could not parse azure devops url"}
    end
  end

  defp get_repo_id(conn, name) do
    case get(conn, "/git/repositories/#{name}") do
      {:ok, %{"id" => id}} -> {:ok, id}
      _ -> {:error, "could not find repo id for name #{name}"}
    end
  end

  defp get(conn, url) do
    url(conn, url)
    |> HTTPoison.get(Connection.headers(conn))
    |> handle_response()
  end

  defp post(conn, url, body) do
    url(conn, url)
    |> HTTPoison.post(Jason.encode!(body), Connection.headers(conn))
    |> handle_response()
  end

  defp patch(conn, url, body) do
    url(conn, url)
    |> HTTPoison.patch(Jason.encode!(body), Connection.headers(conn))
    |> handle_response()
  end

  defp web_url(%{"repository" => %{"webUrl" => web_url}, "pullRequestId" => id}), do: "#{web_url}/pullrequest/#{id}"

  defp url(conn, url) do
    Path.join([
      conn.host,
      "/#{conn.organization}/#{conn.project}/_apis",
      "#{url}?api-version=7.2-preview.2"
    ])
  end

  defp state(%{"status" => "completed"}), do: :merged
  defp state(%{"status" => "abandoned"}), do: :closed
  defp state(_), do: :open

  defp owner(%{"createdBy" => %{"uniqueName" => owner}}), do: owner
  defp owner(_), do: nil

  defp pr_content(pr), do: "#{pr["sourceRefName"]}\n#{pr["title"]}\n#{pr["description"]}"

  defp get_pull_id(url) do
    url = String.downcase(url)
    with %URI{path: "/" <> path} <- URI.parse(url),
         [_, repo_part] <- String.split(path, "/git/repositories/"),
         [repo_id, number] <- String.split(repo_part, "/pullrequests/") do
      {:ok, repo_id, number}
    else
      _ -> {:error, "could not parse azure devops url"}
    end
  end

  defp post_new_comment(conn, repo_id, number, body) do
    case post(conn, Path.join(["/git/repositories", repo_id, "pullRequests", number, "threads"]), %{
      comments: [%{
        content: filter_ansi(body),
        commentType: 1,
        parentCommentId: 0,
      }]
    }) do
      {:ok, %{"id" => tid, "comments" => [%{"id" => cid} | _]}} ->
        {:ok, "#{tid}:#{cid}"}
      err -> err
    end
  end

  defp update_existing_comment(conn, repo_id, number, id, body) do
    with [tid, cid] <- String.split(id, ":"),
         url <- Path.join(["/git/repositories", repo_id, "pullRequests", number, "threads", tid, "comments", cid]),
         {:ok, _} <- patch(conn, url, %{content: filter_ansi(body), commentType: 1}) do
      {:ok, "#{tid}:#{cid}"}
    else
      _ -> {:error, "failed to update existing comment"}
    end
  end

  defp handle_response({:ok, %HTTPoison.Response{status_code: code, body: body}})
    when code >= 200 and code < 300, do: Jason.decode(body)
  defp handle_response({:ok, %HTTPoison.Response{body: body}}), do: {:error, "azure devops request failed: #{body}"}
  defp handle_response(_), do: {:error, "unknown azure devops error"}

  defp connection(%PrAutomation{connection: %ScmConnection{} = conn}), do: connection(conn)
  defp connection(%ScmConnection{token: token, azure: %ScmConnection.Azure{} = azure}),
    do: Connection.new(token, azure)
  defp connection(_), do: {:error, "no azure devops connection configured"}
end
