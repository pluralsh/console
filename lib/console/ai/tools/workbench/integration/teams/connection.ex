defmodule Console.AI.Tools.Workbench.Integration.Teams.Connection do
  @moduledoc false

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.TeamsConnection}
  alias Console.AI.Tools.Workbench.Integration.Teams.TokenExchange

  @spec with_client(WorkbenchTool.t(), (OAuth2.Client.t() -> term())) :: term()
  def with_client(%WorkbenchTool{configuration: %Configuration{teams: %TeamsConnection{} = t}}, fun)
      when is_function(fun, 1) do
    with {:ok, client} <- TokenExchange.exchange(t.client_id, t.client_secret, t.tenant_id),
         do: fun.(client)
  end

  def with_client(%WorkbenchTool{}, _fun),
    do: {:error, "Microsoft Teams app registration is not configured for this workbench tool."}
end
