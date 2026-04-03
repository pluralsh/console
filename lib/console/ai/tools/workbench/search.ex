defmodule Console.AI.Tools.Workbench.Search do
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.WorkbenchJobActivity

  embedded_schema do
    field :activities, :map, virtual: true
    field :regex, :string
  end

  @json_schema Console.priv_file!("tools/workbench/search.json") |> Jason.decode!()

  def name(), do: "workbench_activity_search"
  def json_schema(), do: @json_schema
  def description(), do: "Searches past workbench activities.  Useful to remember what has been done so far."

  def changeset(model, attrs) do
    model
    |> cast(attrs, [:regex])
    |> validate_required([:regex])
    |> validate_change(:regex, fn
      :regex, regex when is_binary(regex) and byte_size(regex) > 0 ->
        case Regex.compile(regex, [:multiline, :caseless]) do
          {:ok, _} -> []
          {:error, reason} -> [regex: "Invalid regex #{regex}: #{inspect(reason)}"]
        end
      _, _ -> []
    end)
  end

  def implement(%__MODULE__{activities: activities, regex: regex}) do
    with {:ok, regex} <- Regex.compile(regex, [:multiline, :caseless]) do
      Enum.filter(activities, &matches?(&1, regex))
      |> Enum.map(&Map.take(&1, [:type, :prompt, :result]))
      |> Jason.encode()
    end
  end

  defp matches?(%WorkbenchJobActivity{prompt: prompt, result: result}, regex),
    do: regex_match?(prompt, regex) || regex_match?(result, regex)
  defp matches?(_, _), do: false

  defp regex_match?(%{output: output}, regex) when is_binary(output), do: Regex.match?(regex, output)
  defp regex_match?(output, regex) when is_binary(output), do: Regex.match?(regex, output)
  defp regex_match?(_, _), do: false
end
