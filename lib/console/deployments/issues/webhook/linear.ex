defmodule Console.Deployments.Issues.Webhook.Linear do
  @behaviour Console.Deployments.Issues.Provider

  def body(%{"description" => body}), do: body
  def body(_), do: "{empty}"

  def external_id(%{"id" => id}), do: id
  def external_id(_), do: nil

  def title(%{"title" => title}), do: title
  def title(_), do: nil

  def url(%{"url" => url}), do: url
  def url(_), do: nil

  def status(%{"state" => %{"name" => "In Progress"}}), do: :in_progress
  def status(%{"state" => %{"name" => "In Review"}}), do: :open
  def status(%{"state" => %{"name" => "Cancelled"}}), do: :cancelled
  def status(%{"state" => %{"name" => "Done"}}), do: :completed
  def status(_), do: :open
end
