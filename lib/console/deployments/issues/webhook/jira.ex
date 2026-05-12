defmodule Console.Deployments.Issues.Webhook.Jira do
  @moduledoc """
  Handles Jira webhook payloads.

  Supports both Jira Server/Data Center (plain text descriptions) and
  Jira Cloud (Atlassian Document Format descriptions).
  """
  @behaviour Console.Deployments.Issues.Provider

  def body(%{"issue" => %{"fields" => %{"description" => body}}}) when is_binary(body), do: body
  def body(%{"issue" => %{"fields" => %{"description" => %{"content" => content}}}}) when is_list(content),
    do: extract_adf_text(content)
  def body(_), do: "{empty}"

  def external_id(%{"issue" => %{"key" => key}}), do: key
  def external_id(_), do: nil

  def title(%{"issue" => %{"fields" => %{"summary" => title}}}), do: title
  def title(_), do: nil

  def url(%{"issue" => %{"self" => self_url, "key" => key}}) do
    case Regex.run(~r{(https?://[^/]+)}, self_url) do
      [_, base] -> "#{base}/browse/#{key}"
      _ -> self_url
    end
  end
  def url(_), do: nil

  def status(%{"issue" => %{"fields" => %{"status" => %{"name" => status}}}}), do: map_status(status)
  def status(_), do: :open

  defp map_status(status) when is_binary(status) do
    String.downcase(status)
    |> String.replace(~r/[^a-z]/, "")
    |> case do
      "inprogress" -> :in_progress
      "done" -> :completed
      "closed" -> :completed
      "resolved" -> :completed
      "cancelled" -> :cancelled
      "canceled" -> :cancelled
      "rejected" -> :cancelled
      "wontdo" -> :cancelled
      "wontfix" -> :cancelled
      _ -> :open
    end
  end
  defp map_status(_), do: :open

  defp extract_adf_text(content) when is_list(content) do
    content
    |> Enum.map(&extract_adf_node/1)
    |> Enum.join("\n")
    |> String.trim()
    |> case do
      "" -> "{empty}"
      text -> text
    end
  end

  defp extract_adf_node(%{"type" => "text", "text" => text}), do: text
  defp extract_adf_node(%{"type" => "hardBreak"}), do: "\n"
  defp extract_adf_node(%{"content" => content}) when is_list(content) do
    Enum.map(content, &extract_adf_node/1) |> Enum.join()
  end
  defp extract_adf_node(_), do: ""
end
