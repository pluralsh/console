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
  def pipe(%{item: %{status: :healthy, updated_at: uat} = svc}) do
    Logger.info "Kicking any pipelines associated with #{svc.id}"
    recent = Timex.now()
             |> Timex.shift(minutes: -2)
             |> Timex.before?(uat)
    if recent do
      case Console.Repo.preload(svc, [stage_services: :stage]) do
        %{stage_services: [_ | _] = ss} -> Enum.map(ss, & &1.stage)
        _ -> :ok
      end
    else
      Logger.info "Service #{svc.id} has no recent updates"
    end
  end
  def pipe(_), do: :ok
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
