defmodule Console.AI.Tools.Workbench.Search do
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.{WorkbenchJobActivity, WorkbenchJobThought}

  embedded_schema do
    field :activities, :map, virtual: true
    field :regex, :string
  end

  @json_schema Console.priv_file!("tools/workbench/search.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "workbench_activity_search"
  def description(_), do: "Searches past workbench activities.  Useful to remember what has been done so far."

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
      |> Enum.map(&simplify/1)
      |> Jason.encode()
    end
  end

  defp matches?(%WorkbenchJobActivity{prompt: prompt, result: result}, regex),
    do: regex_match?(prompt, regex) || regex_match?(result, regex)
  defp matches?(_, _), do: false

  defp regex_match?(%{output: output}, regex) when is_binary(output), do: Regex.match?(regex, output)
  defp regex_match?(output, regex) when is_binary(output), do: Regex.match?(regex, output)
  defp regex_match?(_, _), do: false

  defp simplify(%WorkbenchJobActivity{type: type,prompt: prompt} = activity) do
    %{
      type: type,
      prompt: prompt,
      result: simplify_result(activity.result),
      thoughts: Enum.map((if is_list(activity.thoughts), do: activity.thoughts, else: []), &simplify_thought/1)
    }
  end

  defp simplify_result(%WorkbenchJobActivity.WorkbenchJobResult{output: output} = result) do
    %{
      output: output,
      error: result.error
    }
  end

  defp simplify_thought(%WorkbenchJobThought{tool_name: name, tool_args: args} = thought) do
    %{
      tool_name: name,
      tool_args: args,
      inserted_at: thought.inserted_at
    }
  end
end
