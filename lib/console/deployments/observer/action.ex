defmodule Console.Deployments.Observer.Action do
  import Console.Deployments.Pr.Utils, only: [render_solid: 2]
  alias Console.Schema.{Observer, PrAutomation, Pipeline, User}
  alias Console.Deployments.{Git, Pipelines}
  alias Console.Services.{Users, Rbac}
  alias Console.Deployments.Observer.Attributes

  def act(observer, %Observer.ObserverAction{type: :pr, configuration: %{pr: %{} = pr}}, input, attrs) do
    tpl = pr.branch_template || "plrl/auto/#{observer.name}-$value-#{Console.rand_alphanum(6)}"
    branch = String.replace(tpl, "$value", input)
    ctx = replace_map(pr.context, input, attrs)
    case Git.get_pr_automation(pr.automation_id) do
      %PrAutomation{} = pra -> Git.create_pull_request(%{}, ctx, pra.id, branch, pr.repository, actor(pr))
      nil -> {:error, "could not find automation #{pr.automation_id}"}
    end
  end

  def act(_, %Observer.ObserverAction{type: :pipeline, configuration: %{pipeline: %{} = pipe}}, input, attrs) do
    ctx = replace_map(pipe.context, input, attrs)
    case Pipelines.get_pipeline(pipe.pipeline_id) do
      %Pipeline{} = p ->
        Pipelines.create_pipeline_context(%{context: ctx}, p.id, bot())
      nil -> {:error, "could not find pipeline #{pipe.pipeline_id}"}
    end
  end

  def act(_, _, _, _), do: {:error, "observer action was misconfigured"}

  defp replace_map(result, value, attrs) do
    attrs_map = Attributes.attrs(attrs)
                |> Map.put(:value, value)

    Enum.reduce(attrs_map, result, fn {k, v}, acc -> _replace_map(acc, k, v) end)
    |> replace_solid(attrs_map)
  end

  defp replace_solid(%{} = map, attrs_map), do: Map.new(map, fn {k, v} -> {k, replace_solid(v, attrs_map)} end)
  defp replace_solid(s, attrs_map) when is_binary(s) do
    case render_solid(s, attrs_map) do
      {:ok, result} -> result
      {:error, _} -> s
    end
  end
  defp replace_solid(l, attrs_map) when is_list(l), do: Enum.map(l, &replace_solid(&1, attrs_map))
  defp replace_solid(v, _), do: v

  defp _replace_map(%{} = map, key, val), do: Map.new(map, fn {k, v} -> {k, _replace_map(v, key, val)} end)
  defp _replace_map(l, key, val) when is_list(l), do: Enum.map(l, &_replace_map(&1, key, val))
  defp _replace_map(s, key, val) when is_binary(s) and is_binary(val), do: String.replace(s, "$#{key}", val)
  defp _replace_map(s, key, val) when is_binary(s) and (is_list(val) or is_map(val)),
    do: String.replace(s, "$#{key}", fn _ -> as_val(val) end)
  defp _replace_map(v, _, _), do: v

  defp as_val(v) when is_list(v) or is_map(v), do: Jason.encode!(v)
  defp as_val(v) when is_binary(v), do: v
  defp as_val(v), do: to_string(v)

  defp actor(%{actor: actor}) when is_binary(actor) do
    case Users.get_user_by_email(actor) do
      %User{} = user -> Rbac.preload(user)
      nil -> bot()
    end
  end
  defp actor(_), do: bot()

  defp bot(), do: %{Users.get_bot!("console") | roles: %{admin: true}}
end
