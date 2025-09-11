defmodule Console.Deployments.Observer.Action do
  alias Console.Schema.{Observer, PrAutomation, Pipeline}
  alias Console.Deployments.{Git, Pipelines}
  alias Console.Services.Users

  def act(observer, %Observer.ObserverAction{type: :pr, configuration: %{pr: %{} = pr}}, input) do
    tpl = pr.branch_template || "plrl/auto/#{observer.name}-$value-#{Console.rand_alphanum(6)}"
    branch = String.replace(tpl, "$value", input)
    ctx = replace_map(pr.context, input)
    case Git.get_pr_automation(pr.automation_id) do
      %PrAutomation{} = pra ->
        Git.create_pull_request(%{}, ctx, pra.id, branch, pr.repository, bot())
      nil -> {:error, "could not find automation #{pr.automation_id}"}
    end
  end

  def act(_, %Observer.ObserverAction{type: :pipeline, configuration: %{pipeline: %{} = pipe}}, input) do
    ctx = replace_map(pipe.context, input)
    case Pipelines.get_pipeline(pipe.pipeline_id) do
      %Pipeline{} = p ->
        Pipelines.create_pipeline_context(%{context: ctx}, p.id, bot())
      nil -> {:error, "could not find pipeline #{pipe.pipeline_id}"}
    end
  end

  def act(_, _, _), do: {:error, "observer action was misconfigured"}

  defp replace_map(%{} = map, val) do
    Map.new(map, fn {k, v} -> {k, replace_map(v, val)} end)
  end
  defp replace_map(l, val) when is_list(l), do: Enum.map(l, &replace_map(&1, val))
  defp replace_map(s, val) when is_binary(s) and is_binary(val), do: String.replace(s, "$value", val)
  defp replace_map(v, _), do: v

  defp bot(), do: %{Users.get_bot!("console") | roles: %{admin: true}}
end
