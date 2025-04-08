defmodule Console.Deployments.Pr.Impl.Gitlab do
  import Console.Deployments.Pr.Utils
  alias Console.Deployments.Pr.File
  alias Console.Schema.{PrAutomation, PullRequest, ScmWebhook, ScmConnection}
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
    with {:ok, group, number} <- get_pull_id(url),
         {:ok, conn} <- connection(conn) do
      case post(conn, Path.join(["/api/v4/projects", "#{uri_encode(group)}", "merge_requests", number]), %{
        body: filter_ansi(body)
      }) do
        {:ok, %{"id" => id}} -> {:ok, "#{id}"}
        err -> err
      end
    end
  end

  def files(_, url) do
    case get_mr_info(url) do
      {:ok, mr_info} ->
        res_list = mr_info["changes"]
        |> Enum.map(fn change ->
          sha = mr_info["sha"]
          raw_url = get_raw_url(url, sha, change)
          file_contents = get_file_contents(raw_url)

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
      {:error, reason} ->
        {:error, reason}
    end
  end

  def get_mr_info(url) do
    with {:ok, project_id, mr_iid} <- parse_gitlab_url(url),
         encoded_project_id = URI.encode_www_form(project_id),
         diffs_url = "#{@gitlab_api_url}/projects/#{encoded_project_id}/merge_requests/#{mr_iid}/changes",
         {:ok, diffs_response} <- HTTPoison.get(diffs_url, [{"Content-Type", "application/json"}]),
         {:ok, body} <- Jason.decode(diffs_response.body) do

      {:ok, body}
    else
      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, "HTTP request failed: #{inspect(reason)}"}
      {:error, %Jason.DecodeError{}} ->
        {:error, "Invalid JSON response"}
      {:error, reason} ->
        {:error, reason}
    end
  end

  defp mr_content(mr), do: "#{mr["branch"]}\n#{mr["title"]}\n#{mr["description"]}"

  defp post(conn, url, body) do
    HTTPoison.post("#{conn.host}#{url}", Jason.encode!(body), Connection.headers(conn))
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
    with {:ok, url, token} <- url_and_token(conn, "https://gitlab.com"),
      do: Connection.new(url, token)
  end

  defp get_pull_id(url) do
    with {:ok, %URI{path: "/" <> path}} <- URI.parse(url),
         [group, "/merge_requests/" <> number] <- String.split(path, "-") do
      {:ok, group, number}
    else
      _ -> {:error, "could not parse gitlab url"}
    end
  end

  defp uri_encode(str), do: URI.encode(str, & &1 != ?/ and URI.char_unescaped?(&1))

  defp parse_gitlab_url(url) do
    case Regex.run(~r{gitlab\.com/(.+)/-/merge_requests/(\d+)}, url) do
      [_, project_path, mr_iid] -> {:ok, project_path, mr_iid}
      _ -> {:error, "Invalid GitLab merge request URL"}
    end
  end

  # Construct the raw file URL from the base URL and change info
  defp get_raw_url(base_url, sha, change) do
    # Extract the project path from the base URL
    [_, project_path] = Regex.run(~r{gitlab\.com/(.+)/-/merge}, base_url)

    # Construct the raw URL using the project path and file path
    "https://gitlab.com/#{project_path}/-/raw/#{sha}/#{change["new_path"]}"
  end

  defp get_file_contents(raw_url) do
    case HTTPoison.get(raw_url) do
      {:ok, response} -> response.body
      {:error, reason} -> {:error, "Failed to fetch file contents: #{inspect(reason)}"}
    end
  end

  # Add this helper function to get repo URL (similar to GitHub's to_repo_url)
  defp get_repo_url(url) do
    case String.split(url, "/-/merge_requests") do
      [repo | _] -> "#{repo}.git"
      _ -> url
    end
  end
end
