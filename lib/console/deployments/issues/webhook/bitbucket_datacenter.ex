defmodule Console.Deployments.Issues.Webhook.BitbucketDatacenter do
  @behaviour Console.Deployments.Issues.Provider

  def body(%{"comment" => %{"text" => body}}) when is_binary(body), do: body
  def body(%{"comment" => %{"content" => %{"raw" => body}}}) when is_binary(body), do: body
  def body(%{"pullRequest" => %{"description" => body}}) when is_binary(body), do: body
  def body(%{"pullrequest" => %{"description" => body}}) when is_binary(body), do: body
  def body(_), do: "{empty}"

  def external_id(%{"comment" => %{"id" => id}, "pullRequest" => _} = payload)
      when is_integer(id) or is_binary(id),
      do: "#{infer_repo(payload)}:comment:#{id}"
  def external_id(%{"comment" => %{"id" => id}, "pullrequest" => _} = payload)
      when is_integer(id) or is_binary(id),
      do: "#{infer_repo(payload)}:comment:#{id}"
  def external_id(%{"pullRequest" => %{"id" => id}} = payload) when is_integer(id) or is_binary(id),
    do: "#{infer_repo(payload)}:pull_request:#{id}"
  def external_id(%{"pullrequest" => %{"id" => id}} = payload) when is_integer(id) or is_binary(id),
    do: "#{infer_repo(payload)}:pull_request:#{id}"
  def external_id(_), do: nil

  def title(%{"comment" => %{"id" => id}, "pullRequest" => %{"title" => pr_title}}),
    do: "Comment on PR: #{pr_title} (##{id})"
  def title(%{"comment" => %{"id" => id}, "pullrequest" => %{"title" => pr_title}}),
    do: "Comment on PR: #{pr_title} (##{id})"
  def title(%{"pullRequest" => %{"title" => title}}), do: title
  def title(%{"pullrequest" => %{"title" => title}}), do: title
  def title(_), do: nil

  def url(%{"comment" => %{"id" => id}} = payload) do
    case pull_request_url(payload) do
      nil -> nil
      pr_url -> "#{pr_url}#comment-#{id}"
    end
  end

  def url(%{"pullRequest" => _} = payload), do: pull_request_url(payload)
  def url(%{"pullrequest" => _} = payload), do: pull_request_url(payload)
  def url(_), do: nil

  def status(%{"pullRequest" => %{"state" => state}}), do: map_status(state)
  def status(%{"pullrequest" => %{"state" => state}}), do: map_status(state)
  def status(_), do: :open

  defp infer_repo(%{"repository" => %{"full_name" => full_name}}) when is_binary(full_name), do: full_name
  defp infer_repo(%{"pullRequest" => %{} = pr}) do
    infer_repo_from_pr(pr)
  end
  defp infer_repo(%{"pullrequest" => %{} = pr}) do
    infer_repo_from_pr(pr)
  end
  defp infer_repo(_), do: "unknown"

  defp infer_repo_from_pr(pr) do
    project_key = get_in(pr, ["toRef", "repository", "project", "key"]) || get_in(pr, ["source", "repository", "project", "key"])
    slug = get_in(pr, ["toRef", "repository", "slug"]) || get_in(pr, ["source", "repository", "slug"])

    case {project_key, slug} do
      {project, repo} when is_binary(project) and is_binary(repo) -> "#{project}/#{repo}"
      _ -> "unknown"
    end
  end

  defp pull_request_url(%{"pullRequest" => %{} = pr}), do: pr_url(pr)
  defp pull_request_url(%{"pullrequest" => %{} = pr}), do: pr_url(pr)
  defp pull_request_url(_), do: nil

  defp pr_url(%{"links" => %{"self" => [%{"href" => url} | _]}}) when is_binary(url), do: url
  defp pr_url(%{"links" => %{"self" => %{"href" => url}}}) when is_binary(url), do: url
  defp pr_url(%{"links" => %{"html" => %{"href" => url}}}) when is_binary(url), do: url
  defp pr_url(_), do: nil

  defp map_status("MERGED"), do: :completed
  defp map_status("DECLINED"), do: :cancelled
  defp map_status("SUPERSEDED"), do: :cancelled
  defp map_status(_), do: :open
end
