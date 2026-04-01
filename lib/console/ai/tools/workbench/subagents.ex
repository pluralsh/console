defmodule Console.AI.Tools.Workbench.Subagents do
  use Console.AI.Tools.Workbench.Base

  embedded_schema do
    field :subagents, {:array, Console.AI.Tools.Workbench.Subagent.Subagent}, virtual: true
    field :categories, {:array, Console.Schema.WorkbenchTool.Category}, virtual: true
  end

  @json_schema Console.priv_file!("tools/empty.json") |> Jason.decode!()

  def name(_), do: "workbench_subagents"
  def json_schema(_), do: @json_schema
  def description(_), do: "Get the subagents available to you to invoke."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [])
  end

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
  defp subagent_description(:integration, _), do: "Invoke an integration subagent to interact with internal or external tools and systems, not directly related to dev infrastructure."
  defp subagent_description(_, _), do: "Unknown subagent"

  defp observability_categories(cats) do
    Enum.filter(cats, & &1 in [:metrics, :logs, :traces])
    |> Enum.join(", ")
  end
end
