defprotocol Console.Deployments.PubSub.Pipelineable do
  @fallback_to_any true
  alias Console.Schema.{PipelineStage, PipelinePromotion}

  @doc """
  Returns a stage/edge or nothing to drive a subsequent pipeline action
  """
  @spec pipe(term) :: PipelineStage.t | PipelinePromotion.t | :ok
  def pipe(event)
end

defimpl Console.Deployments.PubSub.Pipelineable, for: Any do
  def pipe(_), do: :ok
end

defimpl Console.Deployments.PubSub.Pipelineable, for: Console.PubSub.ServiceComponentsUpdated do
  require Logger
  alias Console.Schema.Service

  def pipe(%{item: %{status: s} = svc}) when s in ~w(healthy failed)a do
    Logger.info "Kicking any pipelines associated with #{svc.id}"
    if recent?(svc) do
      stages(svc)
      |> handle_status(s)
    else
      Logger.info "Service #{svc.id} has no recent updates"
    end
  end
  def pipe(_), do: :ok

  defp handle_status([], _), do: :ok
  defp handle_status(stages, :healthy), do: stages
  defp handle_status(stages, :failed), do: Enum.map(stages, & {:revert, &1})

  defp recent?(%Service{updated_at: nil}), do: true
  defp recent?(%Service{updated_at: uat}) do
    Timex.now()
    |> Timex.shift(minutes: -2)
    |> Timex.before?(uat)
  end

  defp stages(%Service{} = svc) do
    case Console.Repo.preload(svc, [stage_services: :stage]) do
      %{stage_services: [_ | _] = ss} -> Enum.map(ss, & &1.stage)
      _ -> []
    end
  end
end

defimpl Console.Deployments.PubSub.Pipelineable, for: [Console.PubSub.PipelineGateApproved, Console.PubSub.PipelineGateUpdated] do
  alias Console.Schema.{PipelineGate, PipelineEdge, PipelineStage}
  def pipe(%{item: %PipelineGate{state: :open} = gate}) do
    case Console.Repo.preload(gate, [edge: [from: :promotion]]) do
      %PipelineGate{edge: %PipelineEdge{from: %PipelineStage{promotion: promo}}} -> promo
      _ -> :ok
    end
  end
  def pipe(_), do: :ok
end
