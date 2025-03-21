defmodule Console.Deployments.Pr.Impl.BitBucket do
  import Console.Deployments.Pr.Utils
  alias Console.Schema.{PrAutomation, PullRequest}
  @behaviour Console.Deployments.Pr.Dispatcher

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

  def files(_, _), do: {:ok, []}

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
end
