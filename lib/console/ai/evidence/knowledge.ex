defmodule Console.AI.Evidence.Knowledge do
  alias Console.AI.{Provider, Tool, Tools.Knowledge, Evidence.Context}
  alias Console.AI.Chat.Knowledge

  require Logger

  @preface """
  The following is a description of the evidence for troubleshooting a kubernetes related issue.  Determine whether the knowledge base (formatted as a knowledge
  graph) is needed to investigate the issue.  This is normally not needed for base yaml misconfigurations, but
  can be needed for things like crash loops, OOM errors or indeterminate errors that need external context to fully understand.
  """

  @spec with_knowledge(Provider.history) :: Context.t
  def with_knowledge(history) do
    with %{} = parent <- Tool.parent(),
         true <- Knowledge.exists?(parent),
         {:ok, %{entities: [_ | _]} = graph} <- do_search(history) do
      history
      |> Context.new()
      |> Context.prompt({:user, "I've also found some relevant context from the knowledge graph associated with this issue:"})
      |> Context.prompt({:user, Jason.encode!(graph)})
      |> add_evidence(graph)
    else
      _ ->
        Logger.debug "skipping knowledge graph search"
        Context.new(history)
    end
  end

  defp add_evidence(ctx, %{entities: [_ | _] = entities}) do
    Context.evidence(ctx, Enum.map(entities, & %{type: :knowledge, knowledge: &1}))
  end
  defp add_evidence(ctx, _), do: ctx

  defp do_search(history) do
    case Provider.tool_call(history, [Knowledge], preface: @preface) do
      {:ok, [%{knowledge: %{result: graph}} | _]} -> {:ok, graph}
      _ -> {:error, :ignore}
    end
  end
end
