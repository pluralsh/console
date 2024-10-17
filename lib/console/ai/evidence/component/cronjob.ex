defmodule Console.AI.Evidence.Component.CronJob do
  use Console.AI.Evidence.Base

  def hydrate(%BatchV1.CronJob{status: %{active: [%{name: n, namespace: ns} | _]}}) do
    BatchV1.read_namespaced_job!(ns, n)
    |> Kube.Utils.run()
    |> default_empty(fn job ->
      maybe_job_messages(job)
      |> prepend({:user, "this cronjob has an active job as well, here's its current state:\n#{encode(job)}\nI can also find some of the details of the pod for you."})
    end)
  end
  def hydrate(_), do: {:ok, []}

  defp maybe_job_messages(job) do
    case Console.AI.Evidence.Component.Job.hydrate(job) do
      {:ok, msgs} -> msgs
      _ -> []
    end
  end
end
