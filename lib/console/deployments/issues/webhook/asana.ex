defmodule Console.Deployments.Issues.Webhook.Asana do
  @moduledoc """
  Handles Asana webhook payloads.

  Asana webhooks deliver events in the format:
  ```
  {"events": [{"action": "changed", "resource": {"gid": "123", "resource_type": "task"}, ...}]}
  ```

  This implementation also supports enriched payloads (from Asana automation rules or
  custom integrations) that include full task data in a "task" key.
  """
  @behaviour Console.Deployments.Issues.Provider

  def body(%{"task" => %{"notes" => notes}}) when is_binary(notes), do: notes
  def body(%{"events" => [%{"resource" => _} | _]}), do: "{webhook event}"
  def body(_), do: "{empty}"

  def external_id(%{"task" => %{"gid" => gid}}), do: gid
  def external_id(%{"events" => [%{"resource" => %{"gid" => gid}} | _]}), do: gid
  def external_id(_), do: nil

  def title(%{"task" => %{"name" => name}}), do: name
  def title(%{"events" => [%{"resource" => %{"gid" => gid, "resource_type" => "task"}} | _]}),
    do: "Asana Task #{gid}"
  def title(_), do: nil

  def url(%{"task" => %{"permalink_url" => url}}), do: url
  def url(%{"events" => [%{"resource" => %{"gid" => gid, "resource_type" => "task"}} | _]}),
    do: "https://app.asana.com/0/0/#{gid}"
  def url(_), do: nil

  def status(%{"task" => %{"completed" => true}}), do: :completed
  def status(%{"task" => %{"completed" => false}}), do: :open
  def status(%{"events" => [%{"action" => "deleted"} | _]}), do: :cancelled
  def status(_), do: :open
end
