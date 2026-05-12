defmodule Console.Deployments.Issues.Webhook.Bitbucket do
  @behaviour Console.Deployments.Issues.Provider

  def body(%{"comment" => %{"content" => %{"raw" => body}}}) when is_binary(body), do: body
  def body(%{"pullrequest" => %{"description" => body}}) when is_binary(body), do: body
  def body(%{"issue" => %{"content" => %{"raw" => body}}}) when is_binary(body), do: body
  def body(_), do: "{empty}"

  def external_id(%{"comment" => %{"id" => id}, "pullrequest" => %{}} = payload)
      when is_integer(id) or is_binary(id),
      do: "#{infer_repo(payload)}:comment:#{id}"
  def external_id(%{"comment" => %{"id" => id}, "issue" => %{}} = payload)
      when is_integer(id) or is_binary(id),
      do: "#{infer_repo(payload)}:comment:#{id}"
  def external_id(%{"pullrequest" => %{"id" => id}} = payload) when is_integer(id) or is_binary(id),
    do: "#{infer_repo(payload)}:pull_request:#{id}"
  def external_id(%{"issue" => %{"id" => id}} = payload) when is_integer(id) or is_binary(id),
    do: "#{infer_repo(payload)}:issue:#{id}"
  def external_id(_), do: nil

  def title(%{"comment" => %{"id" => id}, "pullrequest" => %{"title" => pr_title}}),
    do: "Comment on PR: #{pr_title} (##{id})"
  def title(%{"comment" => %{"id" => id}, "issue" => %{"title" => issue_title}}),
    do: "Comment on Issue: #{issue_title} (##{id})"
  def title(%{"pullrequest" => %{"title" => title}}) when is_binary(title), do: title
  def title(%{"issue" => %{"title" => title}}) when is_binary(title), do: title
  def title(_), do: nil

  def url(%{"comment" => %{"links" => %{"html" => %{"href" => url}}}}) when is_binary(url), do: url
  def url(%{"pullrequest" => %{"links" => %{"html" => %{"href" => url}}}}) when is_binary(url), do: url
  def url(%{"issue" => %{"links" => %{"html" => %{"href" => url}}}}) when is_binary(url), do: url
  def url(_), do: nil

  def status(%{"pullrequest" => %{"state" => state}}), do: map_pr_status(state)
  def status(%{"issue" => %{"state" => state}}), do: map_issue_status(state)
  def status(_), do: :open

  defp infer_repo(%{"repository" => %{"full_name" => full_name}}) when is_binary(full_name), do: full_name
  defp infer_repo(%{} = payload) do
    payload
    |> url()
    |> parse_repo_from_url()
  end

  defp parse_repo_from_url(url) when is_binary(url) do
    with %URI{path: path} when is_binary(path) <- URI.parse(url),
         [owner, repo | _] <- String.split(path, "/", trim: true) do
      "#{owner}/#{repo}"
    else
      _ -> "unknown"
    end
  end
  defp parse_repo_from_url(_), do: "unknown"

  defp map_pr_status("OPEN"), do: :open
  defp map_pr_status("MERGED"), do: :completed
  defp map_pr_status("DECLINED"), do: :cancelled
  defp map_pr_status(_), do: :open

  defp map_issue_status(status) when is_binary(status) do
    case String.downcase(status) do
      "resolved" -> :completed
      "closed" -> :completed
      "duplicate" -> :cancelled
      "invalid" -> :cancelled
      "wontfix" -> :cancelled
      _ -> :open
    end
  end

  defp map_issue_status(_), do: :open
end
