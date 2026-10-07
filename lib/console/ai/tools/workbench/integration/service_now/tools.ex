defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.Tools do
  @moduledoc false

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.Configuration.ServiceNowConnection

  @modules [
    Console.AI.Tools.Workbench.Integration.ServiceNow.ListRecords,
    Console.AI.Tools.Workbench.Integration.ServiceNow.GetRecord,
    Console.AI.Tools.Workbench.Integration.ServiceNow.CreateRecord,
    Console.AI.Tools.Workbench.Integration.ServiceNow.UpdateRecord,
    Console.AI.Tools.Workbench.Integration.ServiceNow.ListComments,
    Console.AI.Tools.Workbench.Integration.ServiceNow.AddComment
  ]

  @spec expand(WorkbenchTool.t()) :: [struct()]
  def expand(%WorkbenchTool{tool: :service_now} = workbench_tool) do
    Enum.map(@modules ++ delete_modules(workbench_tool), &struct(&1, tool: workbench_tool))
  end

  defp delete_modules(%WorkbenchTool{
         configuration: %{service_now: %ServiceNowConnection{allow_delete: true}}
       }),
       do: [Console.AI.Tools.Workbench.Integration.ServiceNow.DeleteRecord]

  defp delete_modules(_), do: []
end
