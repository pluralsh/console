defmodule Console.AI.Tools.Workbench.Integration.Pagerduty.Connection do
  @moduledoc false

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.PagerdutyConnection}

  @spec with_connection(WorkbenchTool.t(), (String.t() -> term())) :: term()
  def with_connection(
        %WorkbenchTool{configuration: %Configuration{pagerduty: %PagerdutyConnection{api_token: token}}},
        fun
      )
      when is_function(fun, 1) and is_binary(token) do
    fun.(token)
  end

  def with_connection(%WorkbenchTool{}, _fun),
    do: {:error, "PagerDuty API token is not configured for this workbench tool."}
end
