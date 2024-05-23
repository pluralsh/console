defmodule Console.Deployments.Stacks.Commands do
  alias Console.Schema.{Stack}

  def commands(%Stack{type: :terraform} = stack, dry \\ false) do
    terraform_commands(stack, dry)
    |> stitch_hooks(stack)
  end

  defp stitch_hooks(commands, %Stack{configuration: %{hooks: [_ | _] = hooks}}) do
    cmds = group_by_stage(commands)
    hooks = group_by_stage(hooks)

    Enum.flat_map(~w(init plan verify apply)a, fn stage ->
      (cmds[stage] || []) ++ (hooks[stage] || [])
    end)
    |> indexed()
  end
  defp stitch_hooks(cmds, _), do: cmds

  defp group_by_stage(cmds) do
    Enum.reduce(cmds, %{}, fn
      %{after_stage: stg} = hook, acc ->
        append(acc, stg, cmd(hook.id, hook.cmd, hook.args, stg))
      %{stage: stg} = cmd, acc -> append(acc, stg, cmd)
    end)
    |> Map.new(fn {k, v} -> {k, Enum.reverse(v)} end)
  end

  defp append(acc, stg, cmd) do
    case acc do
      %{^stg => res} -> Map.put(acc, stg, [cmd | res])
      _ -> Map.put(acc, stg, [cmd])
    end
  end

  defp terraform_commands(%Stack{}, true) do
    indexed([
      cmd("init", "terraform", ["init", "-upgrade"], :init),
      cmd("plan", "terraform", ["plan"], :plan),
    ])
  end

  defp terraform_commands(%Stack{deleted_at: d}, _) when not is_nil(d) do
    indexed([
      cmd("init", "terraform", ["init", "-upgrade"], :init),
      cmd("destroy", "terraform", ["destroy", "-auto-approve"], :apply)
    ])
  end

  defp terraform_commands(%Stack{}, _) do
    indexed([
      cmd("init", "terraform", ["init", "-upgrade"], :init),
      cmd("plan", "terraform", ["plan"], :plan),
      cmd("apply", "terraform", ["apply", "terraform.tfplan"], :apply)
    ])
  end

  defp cmd(name, command, args, stage) do
    %{status: :pending, name: name, cmd: command, args: args, stage: stage}
  end

  defp indexed(cmds), do: Enum.with_index(cmds, &Map.put(&1, :index, &2))
end
