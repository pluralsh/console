defmodule Console.Deployments.Pr.Impl.BitBucket do
  import Console.Deployments.Pr.Utils
  alias Console.Deployments.Pr.File
  alias Console.Schema.{PrAutomation, PullRequest}
  @behaviour Console.Deployments.Pr.Dispatcher

   @bitbucket_api_url "https://api.bitbucket.org/2.0"

  defmodule Connection do
    defstruct [:host, :token]

    def new(host, token), do: {:ok, %__MODULE__{host: host, token: token}}

    def headers(%__MODULE__{token: token}) do
      [{"Authorization", "Bearer #{token}"}, {"Content-Type", "application/json"}, {"Accept", "application/json"}]
    end
  end

  def create(%PrAutomation{} = pr, branch, ctx) do
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
          {:ok, %{title: title, ref: branch, url: url, owner: owner(mr)}}
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
    with {:ok, group, number} <- get_pull_id(url),
         {:ok, conn} <- connection(conn) do
      case post(conn, Path.join(["/repositories", "#{URI.encode(group)}", "pullrequests", number, "comments"]), %{
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

  def files(_, url) do
    case get_pr_info(url) do
      {:ok, pr_info} ->
        diff_url = pr_info["links"]["diff"]["href"]
        diff_map = get_diff_map(diff_url)

        diffstat_url = pr_info["links"]["diffstat"]["href"]

        case files_diff_list(diffstat_url) do
          {:ok, diff_list} ->
            res_list = Enum.map(diff_list["values"], fn file ->
              filename = file["new"]["escaped_path"]

              %File{
                url: url,
                repo: pr_info["source"]["repository"]["full_name"],
                title: pr_info["title"],
                contents: get_file_from_raw(file["new"]["links"]["self"]["href"]),
                filename: filename,
                sha: pr_info["source"]["commit"]["hash"],
                patch: Map.get(diff_map, filename, "No diff found for #{filename}"),
                base: pr_info["destination"]["branch"]["name"],
                head: pr_info["source"]["branch"]["name"]
              }
            end)
            |> Enum.filter(&File.valid?/1)
            {:ok, res_list}
          {:error, error} -> IO.puts("Error fetching diffstat: #{inspect(error)}")
        end
      {:error, reason} ->
        {:error, reason}
    end
  end

  defp post(conn, url, body) do
    HTTPoison.post("#{conn.host}#{url}", Jason.encode!(body), Connection.headers(conn))
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

  defp owner(%{"author" => %{"display_name" => owner}}), do: owner
  defp owner(_), do: nil

  defp connection(conn) do
    with {:ok, url, token} <- url_and_token(conn, "https://api.bitbucket.org/2.0"),
      do: Connection.new(url, token)
  end

  defp get_pull_id(url) do
    with {:ok, %URI{path: "/" <> path}} <- URI.parse(url),
         [org, repo, "pull-requests" <> number] <- String.split(path, "/") do
      {:ok, "#{org}/#{repo}", number}
    else
      _ -> {:error, "could not parse bitbucket url"}
    end
  end

  defp get_pr_info(url) do
    with {:ok, workspace, repo_slug, pr_id} <- parse_bitbucket_url(url),
         pr_url = get_pr_url(workspace, repo_slug, pr_id),
         {:ok, pr_response} <- HTTPoison.get(pr_url, [{"Content-Type", "application/json"}]),
         {:ok, pr_body} <- Jason.decode(pr_response.body) do
      {:ok, pr_body}
    else
      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, "HTTP request failed: #{inspect(reason)}"}
      {:error, %Jason.DecodeError{}} ->
        {:error, "Invalid JSON response"}
      {:error, reason} ->
        {:error, reason}
    end
  end

  defp files_diff_list(diffstat_url) do
    case HTTPoison.get(diffstat_url) do
      {:ok, response} -> Jason.decode(response.body)
      {:error, error} -> IO.puts("Error fetching diffstat: #{inspect(error)}")
    end
  end

  defp parse_bitbucket_url(url) do
    case Regex.run(~r{bitbucket\.org/([^/]+)/([^/]+)/pull-requests/(\d+)}, url) do
      [_, workspace, repo_slug, pr_id] -> {:ok, workspace, repo_slug, pr_id}
      _ -> {:error, "Invalid Bitbucket pull request URL"}
    end
  end

  defp get_pr_url(workspace, repo_slug, pr_id) do
    "#{@bitbucket_api_url}/repositories/#{workspace}/#{repo_slug}/pullrequests/#{pr_id}"
  end

  defp get_file_from_raw(url) do
    case HTTPoison.get(url) do
      {:ok, response} -> response.body
      {:error, error} -> IO.puts("Error fetching raw file: #{inspect(error)}")
    end
  end

  defp get_diff_map(diff_url) do
    case HTTPoison.get(diff_url) do
      {:ok, response} ->
        # Parse the unified diff format to extract individual file diffs
        parse_diff_to_map(response.body)
      {:error, error} ->
        IO.puts("Error fetching diff: #{inspect(error)}")
        %{}
    end
  end

  defp parse_diff_to_map(diff_content) do
    # Split the diff content by file
    diff_content
    |> String.split(~r/diff --git a\//)
    |> Enum.reject(&(&1 == ""))
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
  end
end
