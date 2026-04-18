defmodule Console.Deployments.Issues.Webhook.AzureDevops do
  @moduledoc """
  Parses Azure DevOps service hook payloads for work item events.

  See [Webhooks with Azure DevOps](https://learn.microsoft.com/en-us/azure/devops/service-hooks/services/webhooks?view=azure-devops)
  and [Service hooks events](https://learn.microsoft.com/en-us/azure/devops/service-hooks/events?view=azure-devops).
  """
  @behaviour Console.Deployments.Issues.Provider

  require EEx

  @completed_states ~w(Closed Done Completed Complete)
  @cancelled_states ~w(Removed)
  @in_progress_states ~w(Active Committed Resolved Testing Review Design Approved) ++ ["In Progress"]
  @template_file Console.priv_filename(["prompts", "issues", "azure_devops_work_item.md.eex"])

  EEx.function_from_file(:defp, :issue_template, @template_file, [:assigns])

  def body(%{"resource" => %{"fields" => fields}}) when is_map(fields) do
    issue_template(
      title: Map.get(fields, "System.Title"),
      description: Map.get(fields, "System.Description"),
      repro_steps: Map.get(fields, "Microsoft.VSTS.TCM.ReproSteps"),
      acceptance_criteria: Map.get(fields, "Microsoft.VSTS.Common.AcceptanceCriteria"),
      system_info: Map.get(fields, "Microsoft.VSTS.TCM.SystemInfo"),
      found_in_build: Map.get(fields, "Microsoft.VSTS.Build.FoundInBuild"),
      resolved_reason: Map.get(fields, "Microsoft.VSTS.Common.ResolvedReason")
    )
    |> String.trim()
  end
  def body(_), do: "{empty}"

  def external_id(%{"resource" => %{"id" => id}}) when is_integer(id), do: Integer.to_string(id)
  def external_id(%{"resource" => %{"id" => id}}) when is_binary(id), do: id
  def external_id(_), do: nil

  def title(%{"resource" => %{"fields" => %{"System.Title" => title}}}) when is_binary(title), do: title

  def title(%{"resource" => %{"fields" => fields}}) when is_map(fields) do
    Map.get(fields, "System.Title") || Map.get(fields, "Title")
  end

  def title(%{"resource" => %{"name" => name}}) when is_binary(name), do: name
  def title(_), do: nil

  def url(%{"resource" => %{"_links" => %{"html" => %{"href" => href}}}}) when is_binary(href), do: href
  def url(%{"resource" => %{"url" => url}}) when is_binary(url), do: url
  def url(_), do: nil

  def status(%{"resource" => %{"fields" => %{"System.State" => state}}}) when is_binary(state), do: map_state(state)
  def status(_), do: :open

  defp map_state(state) when state in @completed_states, do: :completed
  defp map_state(state) when state in @cancelled_states, do: :cancelled
  defp map_state(state) when state in @in_progress_states, do: :in_progress
  defp map_state(_), do: :open
end
