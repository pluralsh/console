defmodule Console.Deployments.Issues.Webhook do
  import Console.Services.Base, only: [ok: 1]
  alias Console.Deployments.Issues.Webhook.Linear
  alias Console.Deployments.Workbenches
  alias Console.Deployments.Observability.Webhook.Raw
  alias Console.Schema.{WorkbenchWebhook, IssueWebhook}

  def payload(%IssueWebhook{provider: :linear} = webhook, %{"type" => "Issue", "data" => payload}) do
    build_attributes(Linear, payload)
    |> Map.put(:provider, :linear)
    |> workbench_association(webhook)
    |> ok()
  end
  def payload(_, _), do: {:error, "invalid payload"}

  defp workbench_association(data, %IssueWebhook{id: id}) do
    payload = "#{data[:title]}\n#{data[:body]}"
    Workbenches.list_workbench_webhooks_for_issue(id)
    |> Enum.find(&WorkbenchWebhook.matches?(&1, payload))
    |> case do
      %WorkbenchWebhook{workbench_id: wid} -> Map.put(data, :workbench_id, wid)
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
end
