defmodule Console.Pipelines.Supervisor do
  use Supervisor
  alias Console.Pipelines.{
    GlobalService,
    Stack,
    AI,
    Sentinel,
    SentinelRun,
    Observer,
    PullRequest
  }

  def start_link(init_arg) do
    Supervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    children = [
      GlobalService.Producer,
      Stack.Producer,
      AI.Service.Producer,
      AI.Cluster.Producer,
      AI.Alert.Producer,
      AI.Stack.Producer,
      AI.Workbench.Producer,
      Sentinel.Producer,
      SentinelRun.Producer,
      Observer.Producer,
      PullRequest.Producer,
      {GlobalService.Pipeline, GlobalService.Producer},
      {Stack.Pipeline, Stack.Producer},
      {AI.Service.Pipeline, AI.Service.Producer},
      {AI.Cluster.Pipeline, AI.Cluster.Producer},
      {AI.Alert.Pipeline, AI.Alert.Producer},
      {AI.Stack.Pipeline, AI.Stack.Producer},
      {AI.Workbench.Pipeline, AI.Workbench.Producer},
      {Sentinel.Pipeline, Sentinel.Producer},
      {SentinelRun.Pipeline, SentinelRun.Producer},
      {Observer.Pipeline, Observer.Producer},
      {PullRequest.Pipeline, PullRequest.Producer},
    ]
    Supervisor.init(children, strategy: :one_for_one, max_restarts: 15)
  end
end
