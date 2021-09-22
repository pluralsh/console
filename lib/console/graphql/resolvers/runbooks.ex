defmodule Console.GraphQl.Resolvers.Runbooks do
  alias Console.Services.Runbooks

  def list_runbooks(%{namespace: name}, _),
    do: Runbooks.list_runbooks(name)

  def resolve_runbook(%{namespace: ns, name: name}, _),
    do: Runbooks.runbook(ns, name)

  def execute_runbook(
    %{namespace: ns, name: name, input: %{action: action, context: ctx}},
    %{context: %{current_user: user}}) do
    with {:ok, runbook} <- Runbooks.runbook(ns, name),
         {:ok, _} <- Runbooks.execute(runbook, action, ns, ctx, user),
      do: {:ok, true}
  end
end
