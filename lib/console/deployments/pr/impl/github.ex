defmodule Console.Deployments.Pr.Impl.Github do
  import Console.Deployments.Pr.Utils
  alias Console.Schema.{PrAutomation, ScmWebhook, ScmConnection}
  @behaviour Console.Deployments.Pr.Dispatcher

  def create(pr, branch, ctx) do
    with {:ok, client} <- client(pr),
         {:ok, owner, repo} <- identifier(pr),
         {:ok, title, body} <- description(pr, ctx) do
      Tentacat.Pulls.create(client, owner, repo, %{
        head: branch,
        title: title,
        body: body,
        base: pr.branch || "main",
      })
      |> case do
        {_, %{"html_url" => url} = body, _} ->
          {:ok, %{title: title, url: url, owner: owner(body)}}
        {_, body, _} -> {:error, "failed to create pull request: #{Jason.encode!(body)}"}
      end
    end
  end

  def webhook(%ScmConnection{} = conn, %ScmWebhook{owner: owner, hmac: hmac} = hook) do
    with {:ok, client} <- client(conn) do
      Tentacat.Organizations.Hooks.create(client, owner, %{
        "name" => "web",
        "active" => true,
        "events" => ["pull_request"],
        "config" => %{
          "url" => ScmWebhook.url(hook),
          "content_type" => "json",
          "secret" => hmac,
        },
      })
      |> case do
        {_, %{"id" => _}, _} -> :ok
        {_, body, _} -> {:error, "failed to create webhook: #{Jason.encode!(body)}"}
      end
    end
  end

  def pr(%{"pull_request" => %{"html_url" => url} = pr}), do: {:ok, url, %{status: state(pr)}}
  def pr(_), do: :ignore

  defp identifier(%PrAutomation{identifier: id}) when is_binary(id) do
    case String.split(id, "/") do
      [owner, repo] -> {:ok, owner, repo}
      _ -> {:error, "could not parse repo identifier #{id}"}
    end
  end

  defp client(pr) do
    case url_and_token(pr, :pass) do
      {:ok, :pass, token} -> {:ok, Tentacat.Client.new(%{access_token: token})}
      {:ok, url, token} -> {:ok, Tentacat.Client.new(%{access_token: token}, url)}
      err -> err
    end
  end

  defp owner(%{"user" => %{"login" => owner}}), do: owner
  defp owner(_), do: nil

  defp state(%{"merged" => true}), do: :merged
  defp state(%{"state" => "closed", "merged_at" => merged}) when not is_nil(merged), do: :merged
  defp state(%{"state" => "closed"}), do: :closed
  defp state(_), do: :open
end
