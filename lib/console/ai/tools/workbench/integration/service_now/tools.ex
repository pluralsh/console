defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.Tools do
  @moduledoc false

  alias Console.Schema.WorkbenchTool

  @modules [
    Console.AI.Tools.Workbench.Integration.ServiceNow.ListRecords,
    Console.AI.Tools.Workbench.Integration.ServiceNow.GetRecord,
    Console.AI.Tools.Workbench.Integration.ServiceNow.CreateRecord,
    Console.AI.Tools.Workbench.Integration.ServiceNow.UpdateRecord,
    Console.AI.Tools.Workbench.Integration.ServiceNow.ListComments,
    Console.AI.Tools.Workbench.Integration.ServiceNow.AddComment,
    Console.AI.Tools.Workbench.Integration.ServiceNow.ListStates,
    Console.AI.Tools.Workbench.Integration.ServiceNow.TransitionRecord
  ]

  @spec expand(WorkbenchTool.t()) :: [struct()]
  def expand(%WorkbenchTool{tool: :service_now} = workbench_tool),
    do: Enum.map(@modules, &struct(&1, tool: workbench_tool))
end
