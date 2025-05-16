defmodule Console.Deployments.Stacks.Commands do
  alias Console.Schema.{Stack, StackDefinition}

  def commands(stack, dry \\ false)

  def commands(%Stack{type: :terraform} = stack, dry) do
    terraform_commands(stack, dry)
    |> stitch_hooks(stack, dry)
  end

  def commands(%Stack{type: :ansible} = stack, dry) do
    ansible_commands(stack, dry)
    |> stitch_hooks(stack, dry)
  end

  def commands(%Stack{type: :custom}, true), do: []
  def commands(%Stack{type: :custom, definition: %StackDefinition{name: n, steps: steps}} = stack, _) do
    Enum.map(steps, &Map.take(&1, ~w(cmd args stage require_approval)a))
    |> Enum.with_index(&Map.merge(&1, %{index: &2, name: "#{n}-#{&2}", status: :pending}))
    |> stitch_hooks(stack, false)
  end

  defp stitch_hooks(commands, %Stack{configuration: %{hooks: [_ | _] = hooks}}, dry) do
    cmds = group_by_stage(commands)
    hooks = group_by_stage(hooks)

    stages(dry)
    |> Enum.flat_map(fn stage ->
      (cmds[stage] || []) ++ (hooks[stage] || [])
    end)
    |> indexed()
  end
  defp stitch_hooks(cmds, _, _), do: cmds

  defp stages(true), do: ~w(init plan verify)a
  defp stages(_), do: ~w(init plan verify apply destroy)a

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

  defp ansible_commands(%Stack{}, true) do
    indexed([
      cmd("plan", "ansible-playbook", ["main.yaml", "--diff", "--check"], :plan)
    ])
  end

  defp ansible_commands(%Stack{deleted_at: d} = s, _) when not is_nil(d),
    do: ansible_commands(s, true)

  defp ansible_commands(%Stack{}, _) do
    indexed([
      cmd("plan", "ansible-playbook", ["main.yaml", "--diff", "--check"], :plan),
      cmd("apply", "ansible-playbook", ["main.yaml"], :apply)
    ])
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
      cmd("plan", "terraform", ["plan", "-destroy"], :plan),
      cmd("destroy", "terraform", ["destroy", "-auto-approve"], :destroy)
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
