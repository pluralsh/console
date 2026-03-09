defmodule Console.Deployments.Issues.Webhook.Gitlab do
  @behaviour Console.Deployments.Issues.Provider

  def body(%{"object_attributes" => %{"description" => body}}) when is_binary(body), do: body
  def body(_), do: "{empty}"

  def external_id(%{"object_attributes" => %{"iid" => iid}}) when is_integer(iid), do: Integer.to_string(iid)
  def external_id(%{"object_attributes" => %{"iid" => iid}}) when is_binary(iid), do: iid
  def external_id(_), do: nil

  def title(%{"object_attributes" => %{"title" => title}}), do: title
  def title(_), do: nil

  def url(%{"object_attributes" => %{"url" => url}}), do: url
  def url(_), do: nil

  def status(%{"object_attributes" => %{"state" => state}}), do: map_status(state)
  def status(_), do: :open

  defp map_status("opened"), do: :open
  defp map_status("reopened"), do: :open
  defp map_status("closed"), do: :completed
  defp map_status(_), do: :open
end
