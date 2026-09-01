defmodule Console.Deployments.Pr.Impl.Azure do
  import Console.Deployments.Pr.Utils
  alias Console.Deployments.Pr.Review
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

  def create(pra, branch, ctx, _labels \\ []) do
    name = URI.encode(pra.identifier)
    with {:ok, conn} <- connection(pra),
         {:ok, title, body} <- description(pra, ctx),
         {:ok, id} <- get_repo_id(conn, name),
         {:ok, pr} <- post(conn, "/git/repositories/#{id}/pullrequests", %{
                        sourceRefName: "refs/heads/#{branch}",
                        targetRefName: "refs/heads/#{pra.branch || "main"}",
                        title: title,
                        description: body,
                      }),
          {:ok, url} <- web_url(pr) do
      {:ok, %{title: title, ref: branch, body: body, url: url, base: pra.branch || "main", owner: owner(pr)}}
    end
  end

  def webhook(_, _), do: {:error, "not implemented"}

  def pr(%{"eventType" => "git.pullrequest" <> _, "resource" => pr}) do
    with {:ok, url} <- web_url(pr) do
      attrs = Map.merge(%{
        status: state(pr),
        ref: pr["sourceRefName"],
        base: ref_to_branch_name(pr["targetRefName"]),
        title: pr["title"],
        body: pr["description"],
        commit_sha: get_in(pr, ["lastMergeCommit", "commitId"])
      }, pr_associations(pr_content(pr)))
      |> Map.merge(approval(pr))
      |> Console.drop_nils()

      {:ok, url, attrs}
    end
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

  def agent_review(conn, %PullRequest{url: url} = pr, %Review{} = review) do
    with {:ok, id} <- review(conn, pr, Review.summary(review)),
         {:ok, name, number} <- get_pull_id(url),
         {:ok, conn} <- connection(conn),
         {:ok, repo_id} <- get_repo_id(conn, name),
         :ok <- add_inline_comments(conn, repo_id, number, review.comments) do
      {:ok, id}
    end
  end

  def approve(conn, %PullRequest{url: url}, _) do
    with {:ok, name, number} <- get_pull_id(url),
         {:ok, conn} <- connection(conn),
         {:ok, repo_id} <- get_repo_id(conn, name) do
      Path.join(["/git/repositories", repo_id, "pullRequests", number, "reviewers"])
      |> then(&post(conn, &1, %{
        "descriptor" => "Plural Governance",
        "displayName" => "Plural Governance",
        "vote" => 10,
      }))
      |> case do
        {:ok, %{"id" => id}} -> {:ok, "#{id}"}
        err -> err
      end
    end
  end

  def files(_, _), do: {:ok, []}

  def commit_status(_, _, _, _, _), do: :ok

  def merge(conn, %PullRequest{url: url}) do
    body = %{
      status: :completed,
      completionOptions: %{
        deleteSourceBranch: true,
        mergeStrategy: "squash"
      }
    }

    with {:ok, name, number} <- get_pull_id(url),
         {:ok, conn} <- connection(conn),
         {:ok, repo_id} <- get_repo_id(conn, name),
         {:ok, _} <- patch(conn, "/git/repositories/#{repo_id}/pullrequests/#{number}", body),
      do: :ok
  end

  def pr_info(url) do
    with {:ok, repo_id, number} <- get_pull_id(url) do
      {:ok, %{repoId: repo_id, number: number}}
    end
  end

  def pr_details(scm_conn, url) do
    with {:ok, name, number} <- get_pull_id(url),
         {:ok, conn} <- connection(scm_conn),
         {:ok, repo_id} <- get_repo_id(conn, name),
         {:ok, %{"title" => title} = pr} <-
           get(conn, "/git/repositories/#{repo_id}/pullrequests/#{number}") do
      {:ok, %{title: title, body: pr["description"] || ""}}
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
    |> Req.get(headers: Connection.headers(conn), decode_body: false, retry: false)
    |> handle_response()
  end

  defp post(conn, url, body) do
    url(conn, url)
    |> Req.post(headers: Connection.headers(conn), body: Jason.encode!(body), decode_body: false, retry: false)
    |> handle_response()
  end

  defp patch(conn, url, body) do
    url(conn, url)
    |> Req.patch(headers: Connection.headers(conn), body: Jason.encode!(body), decode_body: false, retry: false)
    |> handle_response()
  end

  defp web_url(%{"repository" => %{"webUrl" => web_url}, "pullRequestId" => id})
    when is_binary(web_url) and is_integer(id), do: {:ok, "#{web_url}/pullrequest/#{id}"}
  defp web_url(%{"_links" => %{"html" => %{"href" => href}}})
    when is_binary(href), do: {:ok, href}
  defp web_url(_), do: :ignore

  defp url(conn, url) do
    separator = if String.contains?(url, "?"), do: "&", else: "?"

    Path.join([
      conn.host,
      "/#{conn.organization}/#{conn.project}/_apis",
      url
    ]) <> "#{separator}api-version=7.2-preview.2"
  end

  defp state(%{"status" => "completed"}), do: :merged
  defp state(%{"status" => "abandoned"}), do: :closed
  defp state(_), do: :open

  defp owner(%{"createdBy" => %{"uniqueName" => owner}}), do: owner
  defp owner(_), do: nil

  defp pr_content(pr), do: "#{pr["sourceRefName"]}\n#{pr["title"]}\n#{pr["description"]}"

  defp ref_to_branch_name("refs/heads/" <> name), do: name
  defp ref_to_branch_name(name) when is_binary(name), do: name
  defp ref_to_branch_name(_), do: nil

  defp approval(%{"reviewers" => [_ | _] = reviewers}) do
    approver = Enum.max_by(reviewers, & &1["vote"] || 0)
    case Enum.sum_by(reviewers, & &1["vote"] || 0) do
      v when v > 5 -> %{approver: approver["displayName"], approved: true}
      _ -> %{}
    end
  end
  defp approval(_), do: %{}

  defp get_pull_id(url) do
    url = String.downcase(url)
    with %URI{path: "/" <> path} <- URI.parse(url),
         parts <- String.split(path, "/", trim: true) do
      case parts do
        [_, _, "_git", repo, "pullrequest", number] ->
          {:ok, repo, number}

        api_parts ->
          with [_, repo_part] <- String.split(Enum.join(api_parts, "/"), "/git/repositories/"),
               [repo, number] <- String.split(repo_part, "/pullrequests/") do
            {:ok, repo, number}
          else
            _ -> {:error, "could not parse azure devops url"}
          end
      end
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

  defp handle_response({:ok, %Req.Response{status: code, body: body}})
    when code >= 200 and code < 300, do: Jason.decode(body)
  defp handle_response({:ok, %Req.Response{body: body}}), do: {:error, "azure devops request failed: #{body}"}
  defp handle_response(_), do: {:error, "unknown azure devops error"}

  defp connection(%PrAutomation{connection: %ScmConnection{} = conn}), do: connection(conn)
  defp connection(%ScmConnection{token: token, azure: %ScmConnection.Azure{} = azure}),
    do: Connection.new(token, azure)
  defp connection(_), do: {:error, "no azure devops connection configured"}

  defp add_inline_comments(_, _, _, []), do: :ok

  defp add_inline_comments(conn, repo_id, number, comments) do
    path = Path.join(["/git/repositories", repo_id, "pullRequests", number, "threads"])

    with {:ok, context} <- review_context(conn, repo_id, number) do
      Enum.reduce_while(comments, :ok, fn %Review.Comment{} = comment, :ok ->
        case inline_body(comment, context) do
          {:ok, body} ->
            case post(conn, path, body) do
              {:ok, %{"id" => _}} -> {:cont, :ok}
              {:error, _} = error -> {:halt, error}
            end

          {:error, _} = error ->
            {:halt, error}
        end
      end)
    end
  end

  defp review_context(conn, repo_id, number) do
    root = "/git/repositories/#{repo_id}/pullRequests/#{number}/iterations"

    with {:ok, %{"value" => [_ | _] = iterations}} <- get(conn, root),
         %{"id" => iteration} <- Enum.max_by(iterations, & &1["id"]),
         {:ok, %{"changeEntries" => changes}} <-
           get(conn, "#{root}/#{iteration}/changes?$top=2000") do
      {:ok, %{
        iteration: iteration,
        changes:
          Map.new(changes, fn change ->
            {get_in(change, ["item", "path"]), change["changeTrackingId"]}
          end)
      }}
    else
      {:ok, %{"value" => []}} -> {:error, "pull request has no iterations"}
      error -> error
    end
  end

  defp inline_body(%Review.Comment{} = comment, context) do
    file_path = "/" <> String.trim_leading(comment.filename, "/")

    case Map.get(context.changes, file_path) do
      change_tracking_id when is_integer(change_tracking_id) ->
        {:ok, %{
          comments: [%{
            content: Review.inline_body(comment),
            commentType: 1,
            parentCommentId: 0
          }],
          status: 1,
          threadContext: %{
            filePath: file_path,
            rightFileStart: %{line: comment.line, offset: 1},
            rightFileEnd: %{line: comment.end_line || comment.line, offset: 1}
          },
          pullRequestThreadContext: %{
            changeTrackingId: change_tracking_id,
            iterationContext: %{
              firstComparingIteration: 1,
              secondComparingIteration: context.iteration
            }
          }
        }}

      _ ->
        {:error, "could not find pull request change for #{comment.filename}"}
    end
  end
end
