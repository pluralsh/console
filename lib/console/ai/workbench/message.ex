defmodule Console.AI.Workbench.Message do
  alias Console.Schema.WorkbenchJobActivity

  require EEx

  def to_message(%WorkbenchJobActivity{tool_call: %{call_id: id, name: name, arguments: arguments}} = activity),
    do: {:tool, message_prompt(activity: activity), %{call_id: id, name: name, arguments: arguments}}
  def to_message(%WorkbenchJobActivity{} = activity), do: {:assistant, message_prompt(activity: activity)}

  EEx.function_from_file(:defp, :message_prompt, Console.priv_filename(["prompts", "workbench", "message.txt.eex"]), [:assigns])
end
