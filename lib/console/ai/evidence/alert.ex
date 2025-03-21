defimpl Console.AI.Evidence, for: Console.Schema.Alert do
  use Console.AI.Evidence.Base
  alias Console.AI.Evidence.{Logs, Context, Vector}
  alias Console.Schema.{Alert, Service, Cluster}
  alias Console.Repo

  def generate(%Alert{state: :firing, service: %Service{} = service} = alert) do
    [{:user, alert_prompt(alert)}]
    |> Logs.with_logging(service, force: true, lines: 100)
    |> add_vector_data(service)
    |> Context.prompt({:user, "Please use the data I've listed above to give a clear root cause analysis of this issue."})
    |> Context.result()
  end
  def generate(%Alert{state: :resolved}), do: {:error, "alert is already resolved"}
  def generate(_), do: {:error, "insights only supported for service-bound alerts"}

  def preload(%Alert{} = alert), do: Repo.preload(alert, [insight: :evidence, service: :cluster])

  def insight(%Alert{insight: insight}), do: insight

  def custom(_), do: false

  defp alert_prompt(%Alert{title: t, message: msg, service: %Service{name: s, cluster: %Cluster{name: n, distro: d}}}) do
    """
    There is an alert firing on a workload within the #{distro(d)} kubernetes cluster named: #{n}.  The workload itself
    is deployed using the Plural service #{s}.

    The title of the alert is: #{t}

    The message of the alert is:

    #{msg}

    I'll list some of the logs related to this workload to help analyze the root cause.
    """
  end

  defp add_vector_data(ctx, %Service{flow_id: flow_id}) when is_binary(flow_id) do
    Vector.with_vector_data(ctx, flow_id: flow_id, types: [:pr_file, :alert_resolution])
  end
  defp add_vector_data(ctx, _), do: ctx
end
