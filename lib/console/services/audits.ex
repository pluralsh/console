defmodule Console.Services.Audits do
  alias Console.Schema.AuditContext
  @ctx_key :audit_ctx

  def set_context(%AuditContext{} = ctx),
    do: Process.put(@ctx_key, ctx)

  def context(), do: Process.get(@ctx_key)
end
