defmodule Console.GraphQl.Resolvers.Runbooks do
  use Console.GraphQl.Resolvers.Base, model: Console.Schema.RunbookExecution
  alias Console.Services.Runbooks

  def list_runbooks(%{namespace: name, pinned: true}, _),
    do: Runbooks.list_runbooks(name, :pinned)
  def list_runbooks(%{namespace: name}, _),
    do: Runbooks.list_runbooks(name)

  def resolve_runbook(%{namespace: ns, name: name}, _),
    do: Runbooks.runbook(ns, name)

  def list_executions(args, %{source: runbook}) do
    RunbookExecution.for_runbook(runbook)
    |> RunbookExecution.ordered()
    |> paginate(args)
  end

  def datasources(args, %{source: runbook}),
    do: Runbooks.datasources(runbook, args[:context])

  def execute_runbook(
    %{namespace: ns, name: name, input: %{action: action, context: ctx}},
    %{context: %{current_user: user}}
  ) do
    with {:ok, runbook} <- Runbooks.runbook(ns, name),
      do: Runbooks.execute(runbook, action, ns, ctx, user)
  end
end
