defmodule Console.AI.Tools.Workbench.Integration.Docker.Tools do
  @moduledoc false

  alias Console.Schema.WorkbenchTool

  @modules [
    Console.AI.Tools.Workbench.Integration.Docker.SearchTags,
    Console.AI.Tools.Workbench.Integration.Docker.FetchManifest
  ]

  def expand(%WorkbenchTool{} = tool), do: Enum.map(@modules, &struct(&1, tool: tool))
end
