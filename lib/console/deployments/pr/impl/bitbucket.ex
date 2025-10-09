defmodule Console.Deployments.Pr.Impl.BitBucket do
  import Console.Deployments.Pr.Utils
  import Console.Services.Base, only: [ok: 1]
  alias Console.Deployments.Pr.File
  alias Console.Schema.{PullRequest}
  require Logger

  @behaviour Console.Deployments.Pr.Dispatcher

  @bitbucket_api_url "https://api.bitbucket.org/2.0"

  defmodule Connection do
    defstruct [:host, :token]

    def new(host, token), do: {:ok, %__MODULE__{host: host, token: token}}

    def headers(%__MODULE__{token: token}) do
      [{"Authorization", "Bearer #{token}"}, {"Content-Type", "application/json"}, {"Accept", "application/json"}]
    end
  end

  def create(pr, branch, ctx) do
    with {:ok, conn} <- connection(pr),
         {:ok, title, body} <- description(pr, ctx) do
      id = URI.encode(pr.identifier)
      post(conn, "/repositories/#{id}/pullrequests", %{
        source: %{branch: %{name: branch}},
        destination: %{branch: %{name: pr.branch || "master"}},
        title: title,
        summary: %{raw: body},
      })
      |> case do
        {:ok, %{"links" => %{"html" => %{"href" => url}}} = mr} ->
          {:ok, %{title: title, ref: branch, body: body, url: url, owner: owner(mr)}}
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

  defp pr_content(pr), do: "#{pr["source"]["branch"]["name"]}\n#{pr["title"]}\n#{pr["summary"]["raw"]}"

  def review(conn, %PullRequest{url: url}, body) do
    with {:ok, org, repo, number} <- get_pull_id(url),
         {:ok, conn} <- connection(conn) do
      case post(conn, Path.join(["/repositories", "#{URI.encode("#{org}/#{repo}")}", "pullrequests", number, "comments"]), %{
        content: %{
          raw: filter_ansi(body),
          markup: "markdown"
        }
      }) do
        {:ok, %{"id" => id}} -> {:ok, "#{id}"}
        err -> err
      end
    end
  end

  def files(scm_conn, url) do
    with {:ok, workspace, repo, pr_id} <- get_pull_id(url),
         {:ok, conn} <- connection(scm_conn),
         {:ok, pr_body, diff_url, diffstat_url} <- get_pr_info(conn, workspace, repo, pr_id),
         {:ok, diff_map} <- get_diff_map(conn, diff_url),
         {:ok, diff_list} <- files_diff_list(conn, diffstat_url) do
      Enum.map(diff_list["values"], fn file ->
        filename = file["new"]["escaped_path"]

        %File{
          url: url,
          repo: pr_body["source"]["repository"]["full_name"],
          title: pr_body["title"],
          contents: get_file_from_raw(conn, file["new"]["links"]["self"]["href"]),
          filename: filename,
          sha: pr_body["source"]["commit"]["hash"],
          patch: Map.get(diff_map, filename),
          base: pr_body["destination"]["branch"]["name"],
          head: pr_body["source"]["branch"]["name"]
        }
      end)
      |> Enum.filter(&File.valid?/1)
      |> ok()
    else
      err ->
        Logger.info("failed to list pr files #{inspect(err)}")
        err
    end
  end

  def approve(_, _, _), do: {:error, "not implemented"}

  def pr_info(url) do
    with {:ok, workspace, repo, number} <- get_pull_id(url) do
      {:ok, %{workspace: workspace, repo: repo, number: number}}
    end
  end

  def slug(url) do
    with %URI{path: "/" <> path} <- URI.parse(url),
         [owner, repo | _] <- String.split(path, "/") do
      {:ok, "#{owner}/#{String.trim_trailing(repo, ".git")}"}
    else
      _ -> {:error, "could not parse bitbucket url"}
    end
  end

  def commit_status(_, _, _, _, _), do: :ok

  def merge(_, _), do: :ok

  defp post(conn, url, body) do
    HTTPoison.post("#{conn.host}#{url}", Jason.encode!(body), Connection.headers(conn))
    |> handle_response()
  end

  defp get(%Connection{} = conn, url) do
    HTTPoison.get("#{conn.host}#{url}", Connection.headers(conn))
    |> handle_response()
  end

  defp get(url, headers) when is_binary(url) and is_list(headers) do
    HTTPoison.get(url, headers)
    |> handle_response()
  end

  defp get_raw(url, headers) when is_binary(url) and is_list(headers) do
    HTTPoison.get(url, headers)
    |> handle_response_raw()
  end

  defp handle_response({:ok, %HTTPoison.Response{status_code: code, body: body}})
    when code >= 200 and code < 300, do: Jason.decode(body)
  defp handle_response({:ok, %HTTPoison.Response{body: body}}), do: {:error, "bitbucket request failed: #{body}"}
  defp handle_response(_), do: {:error, "unknown bitbucket error"}

  defp handle_response_raw({:ok, %HTTPoison.Response{status_code: code, body: body}})
    when code >= 200 and code < 300, do: {:ok, body}
  defp handle_response_raw({:ok, %HTTPoison.Response{body: body}}), do: {:error, "bitbucket request failed: #{body}"}
  defp handle_response_raw(_), do: {:error, "unknown bitbucket error"}

  defp state(%{"state" => "MERGED"}), do: :merged
  defp state(%{"state" => "DECLINED"}), do: :closed
  defp state(%{"state" => "SUPERSEDED"}), do: :closed
  defp state(_), do: :open

  defp owner(%{"author" => %{"display_name" => owner}}), do: owner
  defp owner(_), do: nil

  defp connection(conn) do
    with {:ok, url, token} <- url_and_token(conn, @bitbucket_api_url),
      do: Connection.new(url, token)
  end

  defp get_pull_id(url) do
    with %URI{path: "/" <> path} <- URI.parse(url),
         parts <- String.split(path, "/"),
         [workspace, repo, "pull-requests", pr_id] <- parts do
      {:ok, workspace, repo, pr_id}
    else
      _ -> {:error, "could not parse bitbucket url"}
    end
  end

  defp get_pr_info(conn, workspace, repo, pr_id) do
    with {:ok, %{
           "links" => %{
             "diff" => %{"href" => diff_url},
             "diffstat" => %{"href" => diffstat_url}
           }
         } = pr_body} <- get(conn, "/repositories/#{workspace}/#{repo}/pullrequests/#{pr_id}") do
      {:ok, pr_body, diff_url, diffstat_url}
    else
      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, "HTTP request failed: #{inspect(reason)}"}
      {:error, %Jason.DecodeError{}} ->
        {:error, "Invalid JSON response"}
      {:error, reason} ->
        {:error, reason}
    end
  end

  defp files_diff_list(conn, diffstat_url) do
    get(diffstat_url, Connection.headers(conn))
  end

  defp get_file_from_raw(conn, url) do
    case get_raw(url, Connection.headers(conn)) do
      {:ok, content} -> content
      _err -> nil
    end
  end

  defp get_diff_map(conn, diff_url) do
    get_raw(diff_url, Connection.headers(conn))
    |> parse_diff_to_map()
  end

  defp parse_diff_to_map({:ok, diff_content}) do
    # Split the diff content by file
    diff_content
    |> String.split(~r/diff --git a\//)
    |> Enum.reject(& &1 == "")
    |> Enum.map(fn file_diff ->
      # Extract filename and diff content
      case Regex.run(~r/^(.+?) b\/(.+?)(?:\n|$)/, file_diff) do
        [_, _, filename] ->
          {filename, "diff --git a/" <> file_diff}
        _ ->
          # Handle new files differently
          case Regex.run(~r/^(.+?) b\/(.+?)(?:\n|$)/, "diff --git a/" <> file_diff) do
            [_, _, filename] -> {filename, "diff --git a/" <> file_diff}
            _ -> {"unknown", file_diff}
          end
      end
    end)
    |> Map.new()
    |> ok()
  end
  defp parse_diff_to_map(err), do: err
end
