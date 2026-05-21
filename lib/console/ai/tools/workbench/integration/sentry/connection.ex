defmodule Console.AI.Tools.Workbench.Integration.Sentry.Connection do
  @moduledoc false

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.SentryConnection}

  @type conn :: {String.t(), String.t() | nil}

  @spec with_connection(WorkbenchTool.t(), (conn() -> term())) :: term()
  def with_connection(
        %WorkbenchTool{configuration: %Configuration{sentry: %SentryConnection{access_token: token, url: url}}},
        fun
      )
      when is_function(fun, 1) and is_binary(token) do
    fun.({token, url})
  end

  def with_connection(%WorkbenchTool{}, _fun),
    do: {:error, "Sentry access token is not configured for this workbench tool."}
end
