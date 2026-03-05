defmodule Console.Deployments.Issues.Webhook.Github do
  @behaviour Console.Deployments.Issues.Provider

  def body(%{"issue" => %{"body" => body}}) when is_binary(body), do: body
  def body(_), do: "{empty}"

  def external_id(%{"issue" => %{"id" => id}}) when is_integer(id), do: Integer.to_string(id)
  def external_id(%{"issue" => %{"id" => id}}) when is_binary(id), do: id
  def external_id(_), do: nil

  def title(%{"issue" => %{"title" => title}}), do: title
  def title(_), do: nil

  def url(%{"issue" => %{"html_url" => url}}), do: url
  def url(_), do: nil

  def status(%{"issue" => %{"state" => state, "state_reason" => reason}}), do: map_status(state, reason)
  def status(%{"issue" => %{"state" => state}}), do: map_status(state, nil)
  def status(_), do: :open

  defp map_status("open", _), do: :open
  defp map_status("closed", "completed"), do: :completed
  defp map_status("closed", "not_planned"), do: :cancelled
  defp map_status("closed", _), do: :completed
  defp map_status(_, _), do: :open
end
