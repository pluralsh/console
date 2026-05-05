defmodule Console.Deployments.Issues.Webhook.Github do
  @behaviour Console.Deployments.Issues.Provider

  def body(%{"comment" => %{"body" => body}}) when is_binary(body), do: body
  def body(%{"pull_request" => %{"body" => body}}) when is_binary(body), do: body
  def body(%{"issue" => %{"body" => body}}) when is_binary(body), do: body
  def body(_), do: "{empty}"

  def external_id(%{"comment" => %{"id" => id}} = payload),
    do: "#{infer_repo(payload)}:comment:#{id}"
  def external_id(%{"pull_request" => %{"id" => id}} = payload),
    do: "#{infer_repo(payload)}:pull_request:#{id}"
  def external_id(%{"issue" => %{"id" => id}} = payload),
    do: "#{infer_repo(payload)}:issue:#{id}"
  def external_id(_), do: nil

  def title(%{"comment" => %{"id" => id}, "pull_request" => %{"title" => pr_title}}),
    do: "Comment on PR: #{pr_title} (##{id})"
  def title(%{"comment" => %{"id" => id}, "issue" => %{"pull_request" => _, "title" => pr_title}}),
    do: "Comment on PR: #{pr_title} (##{id})"
  def title(%{"pull_request" => %{"title" => title}}), do: title
  def title(%{"issue" => %{"title" => title}}), do: title
  def title(_), do: nil

  def url(%{"pull_request" => %{"html_url" => url}}), do: url
  def url(%{"issue" => %{"pull_request" => _, "html_url" => url}}), do: url
  def url(%{"issue" => %{"html_url" => url}}), do: url
  def url(_), do: nil

  def status(%{"pull_request" => %{"merged" => true}}), do: :completed
  def status(%{"pull_request" => %{"state" => state}}), do: map_status(state, nil)
  def status(%{"issue" => %{"state" => state, "state_reason" => reason}}), do: map_status(state, reason)
  def status(%{"issue" => %{"state" => state}}), do: map_status(state, nil)
  def status(_), do: :open

  defp infer_repo(%{"repository" => %{"full_name" => full_name}}) when is_binary(full_name), do: full_name
  defp infer_repo(%{} = payload) do
    payload
    |> url()
    |> parse_repo_from_url()
    |> case do
      repo when is_binary(repo) -> repo
      _ -> "unknown"
    end
  end

  defp parse_repo_from_url(url) when is_binary(url) do
    with %URI{path: path} <- URI.parse(url),
         true <- is_binary(path),
         [owner, repo | _] <- String.split(path, "/", trim: true) do
      "#{owner}/#{repo}"
    else
      _ -> nil
    end
  end
  defp parse_repo_from_url(_), do: nil

  defp map_status("open", _), do: :open
  defp map_status("closed", "completed"), do: :completed
  defp map_status("closed", "not_planned"), do: :cancelled
  defp map_status("closed", _), do: :completed
  defp map_status(_, _), do: :open
end
