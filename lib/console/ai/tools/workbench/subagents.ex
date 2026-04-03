defmodule Console.AI.Tools.Workbench.Subagents do
  use Console.AI.Tools.Workbench.Base

  embedded_schema do
    field :subagents, {:array, Console.AI.Tools.Workbench.Subagent.Subagent}, virtual: true
    field :categories, {:array, Console.Schema.WorkbenchTool.Category}, virtual: true
  end

  @json_schema Console.priv_file!("tools/empty.json")
               |> Jason.decode!()

  def name(_), do: "workbench_subagents"
  def json_schema(_), do: @json_schema
  def description(_), do: "Get the subagents available to you to invoke."

  def changeset(model, attrs), do: cast(model, attrs, [])

  def implement(_, %__MODULE__{subagents: subagents, categories: categories}) do
    Enum.map(subagents, fn subagent -> %{
      name: subagent,
      description: subagent_description(subagent, categories)
    } end)
    |> Jason.encode()
  end

  defp subagent_description(:coding, _), do: "Invoke a coding subagent to analyze or modify code, generating a pull request."
  defp subagent_description(:infrastructure, _), do: "Invoke an infrastructure subagent to determine infrastructure state and configuration."
  defp subagent_description(:observability, categories), do: "Invoke an observability subagent to query and analyze observability data.  Supported tool capabilities are: #{observability_categories(categories)}"
  defp subagent_description(:integration, _), do: "Invoke an integration subagent to interact with enterprise systems, usually not directly related to devops infrastructure. Often Task tracking tools, knowledge bases or internal compliance software that's not SRE related."
  defp subagent_description(:memory, _), do: "Invoke a memory subagent to search past workbench activities.  Useful to remember what has been done so far, with regex support for finding past work."
  defp subagent_description(_, _), do: "Unknown subagent"

  defp observability_categories(cats) when is_list(cats) do
    Enum.filter(cats, & &1 in [:metrics, :logs, :traces])
    |> Enum.join(", ")
  end
  defp observability_categories(_), do: "not specified but likely supports metrics, logs, traces or error tracking"
end
