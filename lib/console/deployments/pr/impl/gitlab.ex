defmodule Console.Deployments.Pr.Impl.Gitlab do
  import Console.Deployments.Pr.Utils
  alias Console.Schema.{PrAutomation, PullRequest, ScmWebhook, ScmConnection}
  @behaviour Console.Deployments.Pr.Dispatcher

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

  def files(conn, url) do
    with {:ok, group, number} <- get_pull_id(url),
         {:ok, conn} <- connection(conn),
         {:ok, %HTTPoison.Response{status_code: 200, body: body}} <- HTTPoison.get("#{conn.host}/api/v4/projects/#{uri_encode(group)}/merge_requests/#{number}/changes", Connection.headers(conn)),
         {:ok, %{"changes" => changes}} <- Jason.decode(body) do

      files = Enum.map(changes, fn change ->
        # Get full file content for the new_path if it's not deleted
        file_content = if change["deleted_file"] do
          ""
        else
          # Get the full file content from the repository files API
          case get_file_content(conn, group, change["new_path"], "HEAD") do
            {:ok, content} -> content
            _ -> change["diff"] # Fall back to diff if content retrieval fails
          end
        end

        %Console.Deployments.Pr.File{
          url: url,
          repo: get_repo_url(url),
          title: "MR #{number}",
          contents: file_content,
          filename: change["new_path"],
          sha: nil,  # GitLab doesn't provide individual file SHAs in the diff API
          patch: change["diff"],
          base: change["old_path"],
          head: change["new_path"]
        }
      end)

      {:ok, files}
    else
      {:ok, %HTTPoison.Response{status_code: code, body: body}} ->
        {:error, "gitlab request failed with status #{code}: #{body}"}

      {:error, error} ->
        {:error, "gitlab request failed: #{inspect(error)}"}
    end
  end

  # Helper function to get the full content of a file
  defp get_file_content(conn, group, file_path, ref) do
    url = "#{conn.host}/api/v4/projects/#{uri_encode(group)}/repository/files/#{uri_encode(file_path)}/raw?ref=#{ref}"

    case HTTPoison.get(url, Connection.headers(conn)) do
      {:ok, %HTTPoison.Response{status_code: 200, body: content}} ->
        {:ok, content}
      {:ok, %HTTPoison.Response{status_code: code, body: error_body}} ->
        {:error, "failed to get file content with status #{code}: #{error_body}"}
      {:error, error} ->
        {:error, "request failed: #{inspect(error)}"}
    end
  end

  defp get_repo_url(url) do
    url
    |> String.replace("/api/v4/projects/", "")
    |> String.replace("/merge_requests/", "/-/merge_requests/")
    |> String.replace("/changes", ".git")
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
end
