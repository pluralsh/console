defmodule Console.AI.Tools.Workbench.Integration.Pagerduty.Tools do
  @moduledoc false

  alias Console.Schema.WorkbenchTool

  @modules [
    Console.AI.Tools.Workbench.Integration.Pagerduty.GetIncident,
    Console.AI.Tools.Workbench.Integration.Pagerduty.ListIncidents,
    Console.AI.Tools.Workbench.Integration.Pagerduty.ListIncidentNotes,
    Console.AI.Tools.Workbench.Integration.Pagerduty.ListIncidentLogEntries
  ]

  @spec expand(WorkbenchTool.t()) :: [struct()]
  def expand(%WorkbenchTool{} = tool), do: Enum.map(@modules, &struct(&1, tool: tool))
end
