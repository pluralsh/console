defmodule Console.Deployments.Pr.Impl.Gitlab do
  import Console.Deployments.Pr.Utils
  alias Console.Schema.{PrAutomation, ScmWebhook, ScmConnection}
  @behaviour Console.Deployments.Pr.Dispatcher

  defmodule Connection do
    defstruct [:host, :token]

    def new(host, token), do: {:ok, %__MODULE__{host: host, token: token}}

    def headers(%__MODULE__{token: token}) do
      [{"Authorization", "Bearer #{token}"}, {"Content-Type", "application/json"}]
    end
  end

  def create(%PrAutomation{} = pr, branch, ctx) do
    with {:ok, conn} <- connection(pr),
         {:ok, title, body} <- description(pr, ctx) do
      id = URI.encode(pr.identifier)
      post(conn, "/api/v4/projects/#{id}/merge_requests", %{
        source_branch: branch,
        target_branch: pr.branch || "master",
        title: title,
        description: body,
        allow_collaboration: true,
      })
      |> case do
        {:ok, %{"web_url" => url} = mr} -> {:ok, %{title: title, url: url, owner: owner(mr)}}
        err -> err
      end
    end
  end

  def webhook(%ScmConnection{} = conn, %ScmWebhook{owner: owner, hmac: hmac} = hook) do
    with {:ok, conn} <- connection(conn) do
      post(conn, "/api/v4/groups/#{URI.encode(owner)}/hooks", %{
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

  def pr(%{"object_attributes" => %{"url" => url} = mr}), do: {:ok, url, %{status: state(mr)}}
  def pr(_), do: :ignore

  defp post(conn, url, body) do
    HTTPoison.post("#{conn.host}#{url}", Jason.encode!(body), Connection.headers(conn))
    |> handle_response()
  end

  defp handle_response({:ok, %HTTPoison.Response{status_code: 200, body: body}}),
    do: Jason.decode(body)
  defp handle_response({:ok, %HTTPoison.Response{body: body}}), do: {:error, "failed to create pr: #{body}"}
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
end
