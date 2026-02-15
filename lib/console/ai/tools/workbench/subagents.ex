defmodule Console.AI.Tools.Workbench.Subagents do
  use Console.AI.Tools.Workbench.Base

  embedded_schema do
    field :subagents, {:array, Console.AI.Tools.Workbench.Subagent.Subagent}, virtual: true
  end

  @json_schema Console.priv_file!("tools/empty.json") |> Jason.decode!()

  def name(_), do: "workbench_subagents"
  def json_schema(_), do: @json_schema
  def description(_), do: "Get the subagents available to you to invoke."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [])
  end

  def implement(_, %__MODULE__{subagents: subagents}) do
    Enum.map(subagents, fn subagent -> %{
      name: subagent,
      description: subagent_description(subagent)
    } end)
    |> Jason.encode()
  end

  defp subagent_description(:coding), do: "Invoke a coding subagent to analyze or modify code, generating a pull request."
  defp subagent_description(:infrastructure), do: "Invoke an infrastructure subagent to make a infrastructure change."
  defp subagent_description(:observability), do: "Invoke an observability subagent to query and analyze observability data."
  defp subagent_description(:integration), do: "Invoke an integration subagent to interact with internal or external tools and systems, not directly related to dev infrastructure."
  defp subagent_description(_), do: "Unknown subagent"
end
