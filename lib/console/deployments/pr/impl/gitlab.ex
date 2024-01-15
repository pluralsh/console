defmodule Console.Deployments.Pr.Impl.Gitlab do
  import Console.Deployments.Pr.Utils
  alias Console.Schema.{PrAutomation}
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
      HTTPoison.post("#{conn.host}/api/v4/projects/#{id}/merge_requests", Jason.encode!(%{
        source_branch: branch,
        target_branch: pr.branch,
        title: title,
        description: body,
        allow_collaboration: true,
      }), Connection.headers(conn))
      |> handle_response()
    end
  end

  defp handle_response({:ok, %HTTPoison.Response{status_code: 200, body: body}}) do
    case Jason.decode(body) do
      {:ok, %{"web_url" => url}} -> {:ok, url}
      _ -> {:error, "could not parse response body: #{body}"}
    end
  end
  defp handle_response({:ok, %HTTPoison.Response{body: body}}), do: {:error, "failed to create pr: #{body}"}
  defp handle_response(_), do: {:error, "unknown gitlab error"}

  defp connection(%PrAutomation{} = pr) do
    with {:ok, url, token} <- url_and_token(pr, "https://gitlab.com"),
      do: Connection.new(url, token)
  end
end
