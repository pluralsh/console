defmodule Console.Deployments.Pr.Impl.Gitlab do
  import Console.Deployments.Pr.Utils
  alias Console.Deployments.Pr.File
  alias Console.Schema.{PrAutomation, PullRequest, ScmWebhook, ScmConnection}
  require Logger

  @behaviour Console.Deployments.Pr.Dispatcher

  @gitlab_api_url "https://gitlab.com/api/v4"

  defmodule Connection do
    defstruct [:host, :token]

    def new(host, token), do: {:ok, %__MODULE__{host: host, token: token}}

    def headers(%__MODULE__{token: token}) do
      [{"PRIVATE-TOKEN", token}, {"Content-Type", "application/json"}]
    end
  end

  def create(%PrAutomation{} = pr, branch, ctx) do
    with {:ok, conn} <- connection(pr),
         {:ok, title, body} <- description(pr, ctx) do
      post(conn, "/api/v4/projects/#{uri_encode(pr.identifier)}/merge_requests", %{
        source_branch: branch,
        target_branch: pr.branch || "master",
        title: title,
        description: body,
        allow_collaboration: true,
      })
      |> case do
        {:ok, %{"web_url" => url} = mr} ->
          {:ok, %{title: title, ref: branch, url: url, owner: owner(mr)}}
        err -> err
      end
    end
  end

  def webhook(%ScmConnection{} = conn, %ScmWebhook{owner: owner, hmac: hmac} = hook) do
    with {:ok, conn} <- connection(conn) do
      post(conn, "/api/v4/groups/#{uri_encode(owner)}/hooks", %{
        url: ScmWebhook.url(hook),
        merge_requests_events: true,
        token: hmac,
      })
      |> case do
        {:ok, _} -> :ok
        err -> err
      end
    end
  end

  def pr(%{"object_attributes" => %{"url" => url} = mr}) do
    attrs = Map.merge(%{
      status: state(mr),
      ref: mr["source_branch"],
      title: mr["title"],
      body: mr["description"]
    }, pr_associations(mr_content(mr)))
    |> Console.drop_nils()

    {:ok, url, attrs}
  end
  def pr(_), do: :ignore

  def review(conn, %PullRequest{url: url}, body) do
    with {:ok, owner, repo, number} <- get_pull_id(url),
         {:ok, conn} <- connection(conn) do
      case post(conn, Path.join(["/api/v4/projects", "#{uri_encode("#{owner}/#{repo}")}", "merge_requests", number]), %{
        body: filter_ansi(body)
      }) do
        {:ok, %{"id" => id}} -> {:ok, "#{id}"}
        err -> err
      end
    end
  end

  def files(conn, url) do
    with {:ok, group, repo, number} <- get_pull_id(url),
         {:ok, pr_conn} <- connection(conn),
         {:ok, mr_info} <- get_mr_info(pr_conn, group, repo, number) do

      res_list = Enum.map(mr_info["changes"], fn change ->
        sha = mr_info["sha"]
        file_contents = get_file_contents_from_commit(pr_conn, group, repo, change["new_path"], sha)

        %File{
          url: url,                              # MR URL
          repo: get_repo_url(url),               # Repository URL
          title: mr_info["title"],               # MR title
          contents: file_contents,               # File contents
          filename: change["new_path"],          # File path
          sha: sha,                              # Commit SHA
          patch: change["diff"],                 # The diff/patch
          base: mr_info["target_branch"],        # Target branch
          head: mr_info["source_branch"]         # Source branch
        }
      end)
      |> Enum.filter(&File.valid?/1)
      {:ok, res_list}
    else
      {:error, reason} ->
        Logger.info("failed to list pr files #{inspect(reason)}")
        {:error, reason}
    end
  end

  def pr_info(url) do
    with {:ok, group, repo, number} <- get_pull_id(url) do
      {:ok, %{group: group, repo: repo, number: number}}
    end
  end

  defp mr_content(mr), do: "#{mr["branch"]}\n#{mr["title"]}\n#{mr["description"]}"

  defp post(conn, url, body) do
    HTTPoison.post("#{conn.host}#{url}", Jason.encode!(body), Connection.headers(conn))
    |> handle_response()
  end

  defp get(conn, url) do
    HTTPoison.get("#{conn.host}#{url}", Connection.headers(conn))
    |> handle_response()
  end

  defp handle_response({:ok, %HTTPoison.Response{status_code: code, body: body}})
    when code >= 200 and code < 300, do: Jason.decode(body)
  defp handle_response({:ok, %HTTPoison.Response{body: body}}), do: {:error, "gitlab request failed: #{body}"}
  defp handle_response(_), do: {:error, "unknown gitlab error"}

  defp state(%{"state" => "merged"}), do: :merged
  defp state(%{"state" => "closed"}), do: :closed
  defp state(_), do: :open

  defp owner(%{"author" => %{"username" => owner}}), do: owner
  defp owner(_), do: nil

  defp connection(conn) do
    with {:ok, url, token} <- url_and_token(conn, @gitlab_api_url),
      do: Connection.new(url, token)
  end

  defp uri_encode(str), do: URI.encode(str, & &1 != ?/ and URI.char_unescaped?(&1))

  defp get_pull_id(url) do
    with %URI{path: "/" <> path} <- URI.parse(url),
         [project_path, mr_path] <- String.split(path, "/-/"),
         [group, repo] <- String.split(project_path, "/", trim: true),
         ["merge_requests", number] <- String.split(mr_path, "/", trim: true) do
      {:ok, group, repo, number}
    else
      %URI{} -> {:error, "Invalid GitLab merge request URL: missing or invalid path"}
      _ -> {:error, "Invalid GitLab merge request URL: invalid format"}
    end
  end

  def get_mr_info(conn, group, repo, mr_iid) do
    encoded_project_id = URI.encode_www_form("#{group}/#{repo}")
    get(conn, "/projects/#{encoded_project_id}/merge_requests/#{mr_iid}/changes")
  end

  # Add this helper function to get repo URL (similar to GitHub's to_repo_url)
  defp get_repo_url(url) do
    case String.split(url, "/-/merge_requests") do
      [repo | _] -> "#{repo}.git"
      _ -> url
    end
  end

  defp get_file_contents_from_commit(conn, group, repo, file_path, sha) do
    encoded_project_id = URI.encode_www_form("#{group}/#{repo}")
    encoded_file_path = URI.encode_www_form(file_path)
    case get(conn, "/projects/#{encoded_project_id}/repository/files/#{encoded_file_path}?ref=#{sha}") do
      {:ok, %{"content" => content}} ->
        content
      _err -> nil
    end
  end
end
