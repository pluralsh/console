defmodule Console.Deployments.Issues.Webhook do
  import Console.Services.Base, only: [ok: 1]
  alias Console.Deployments.Issues.Webhook.{Linear, Jira, Asana, Github, Gitlab, AzureDevops}
  alias Console.Deployments.Workbenches
  alias Console.Deployments.Observability.Webhook.Raw
  alias Console.Schema.{WorkbenchWebhook, IssueWebhook}

  def payload(%IssueWebhook{provider: :linear} = webhook, %{"type" => "Issue", "data" => payload}) do
    build_attributes(Linear, payload)
    |> Map.put(:provider, :linear)
    |> with_payload(payload)
    |> workbench_association(webhook)
    |> ok()
  end

  def payload(%IssueWebhook{provider: :jira} = webhook, %{"issue" => _} = payload) do
    build_attributes(Jira, payload)
    |> Map.put(:provider, :jira)
    |> with_payload(payload)
    |> workbench_association(webhook)
    |> ok()
  end

  def payload(%IssueWebhook{provider: :asana} = webhook, %{"task" => _} = payload) do
    build_attributes(Asana, payload)
    |> Map.put(:provider, :asana)
    |> with_payload(payload)
    |> workbench_association(webhook)
    |> ok()
  end

  def payload(%IssueWebhook{provider: :asana} = webhook, %{"events" => [_ | _]} = payload) do
    build_attributes(Asana, payload)
    |> Map.put(:provider, :asana)
    |> with_payload(payload)
    |> workbench_association(webhook)
    |> ok()
  end

  def payload(%IssueWebhook{provider: :github} = webhook, %{"issue" => _} = payload) do
    build_attributes(Github, payload)
    |> Map.put(:provider, :github)
    |> with_payload(payload)
    |> workbench_association(webhook)
    |> ok()
  end

  def payload(%IssueWebhook{provider: :gitlab} = webhook, %{"object_attributes" => _, "object_kind" => "issue"} = payload) do
    build_attributes(Gitlab, payload)
    |> Map.put(:provider, :gitlab)
    |> with_payload(payload)
    |> workbench_association(webhook)
    |> ok()
  end

  def payload(%IssueWebhook{provider: :azure_devops} = webhook, %{"resource" => %{"id" => _}, "eventType" => "workitem." <> _} = payload) do
    build_attributes(AzureDevops, payload)
    |> Map.put(:provider, :azure_devops)
    |> with_payload(payload)
    |> workbench_association(webhook)
    |> ok()
  end

  def payload(_, _), do: {:error, "invalid payload"}

  defp workbench_association(data, %IssueWebhook{id: id}) do
    payload = "#{data[:title]}\n#{data[:body]}"
    Workbenches.list_workbench_webhooks_for_issue(id)
    |> Enum.find(&WorkbenchWebhook.matches?(&1, payload))
    |> case do
      %WorkbenchWebhook{id: id, workbench_id: wid} = wh -> Map.merge(data, %{workbench_id: wid, workbench_webhook_id: id, webhook: wh})
      _ -> data
    end
  end

  defp build_attributes(impl, payload) do
    basic_associations(%{
      title: impl.title(payload),
      url: impl.url(payload),
      body: impl.body(payload),
      external_id: impl.external_id(payload),
      status: impl.status(payload),
    })
  end

  def basic_associations(attrs) do
    txt = "#{attrs[:title]}\n#{attrs[:body]}"
    Enum.reduce(~w(flow)a, attrs, fn scope, acc ->
      case Map.get(acc, :"#{scope}_id") do
        id when is_binary(id) -> acc
        _ -> Raw.associations(scope, txt, acc)
      end
    end)
  end

  defp with_payload(attrs, payload) when is_map(attrs) and is_map(payload),
    do: Map.put(attrs, :payload, payload)
end
