defmodule Console.AI.Tools.Workbench.Subagents do
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.Workbench

  embedded_schema do
    field :bench, :map, virtual: true
    field :subagents, {:array, Console.AI.Tools.Workbench.Subagent.Subagent}, virtual: true
    field :categories, {:array, Console.Schema.WorkbenchTool.Category}, virtual: true
  end

  @json_schema Console.priv_file!("tools/empty.json")
               |> Jason.decode!()

  def name(_), do: "workbench_subagents"
  def json_schema(_), do: @json_schema
  def description(_), do: "Get the subagents available to you to invoke."

  def changeset(model, attrs), do: cast(model, attrs, [])

  def implement(%__MODULE__{bench: bench, subagents: subagents, categories: categories}) do
    Enum.map(subagents, fn subagent -> %{
      name: subagent,
      description: subagent_description(bench, subagent, categories)
    } end)
    |> Jason.encode()
  end

  defp subagent_description(_, :coding, _), do: "Invoke a coding subagent to analyze or modify code, generating a pull request.  This subagent will use either direct repository urls or container image urls to determine where to make code changes, so include either or both to guide it appropriately, alongside a clear spec of the change or analysis needed."
  defp subagent_description(%Workbench{configuration: %{infrastructure: %{} = infra}}, :infrastructure, _), do: infra_description(infra)
  defp subagent_description(_, :infrastructure, _), do: "Invoke an infrastructure subagent to determine infrastructure state and configuration.  Use this to deeply investiage kubernetes or IaaS data necessary for the job at hand."
  defp subagent_description(_, :observability, categories), do: "Invoke an observability subagent to query and analyze observability data.  Supported tool capabilities are: #{observability_categories(categories)}"
  defp subagent_description(_, :integration, _), do: "Invoke an integration subagent to interact with enterprise systems, usually not directly related to devops infrastructure. Often Task tracking tools, knowledge bases or internal compliance software that's not SRE related."
  defp subagent_description(_, :memory, _), do: "Invoke a memory subagent to search past workbench activities.  Useful to remember what has been done so far, with regex support for finding past work."
  defp subagent_description(_, :skill, _), do: "Invoke a skill subagent to update the skills for the current workbench.  This subagent will use the skills API to update the skills for the current workbench."
  defp subagent_description(_, :history, _), do: "Invoke a history subagent to search past workbench activities.  Useful to remember what has been done so far, with regex support for finding past work."
  defp subagent_description(_, :search, _), do: "Invoke a web search subagent to search the public web for information.  Useful to find documentation, public pricing information, and anything else that's not specific to deployed infrastructure."
  defp subagent_description(_, _, _), do: "Unknown subagent"

  defp infra_description(%{vulnerabilities: vulns, pod_logs: logs}) when vulns or logs do
    Enum.filter([additional(:vulns, vulns), additional(:pod_logs, logs)], & &1 != nil)
    |> Enum.join(" and ")
    |> then(& "#{subagent_description(nil, :infrastructure, nil)} including #{&1}")
  end
  defp infra_description(_), do: subagent_description(nil, :infrastructure, nil)

  defp additional(:vulns, true), do: "the ability to fetch plural integrated vulnerabilities from trivy"
  defp additional(:pod_logs, true), do: "the ability to fetch container stdout/stderr logs from pods"
  defp additional(_, _), do: nil

  defp observability_categories(cats) when is_list(cats) do
    Enum.filter(cats, & &1 in [:metrics, :logs, :traces])
    |> Enum.join(", ")
  end
  defp observability_categories(_), do: "not specified but likely supports metrics, logs, traces or error tracking"
end
