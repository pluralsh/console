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
  def commands(%Stack{type: :custom, deleted_at: d, definition: %StackDefinition{name: n, delete_steps: delete_steps}} = stack, _)
    when not is_nil(d) and is_list(delete_steps) do
    Enum.map(delete_steps, &Map.take(&1, ~w(cmd args stage require_approval)a))
    |> Enum.with_index(&Map.merge(&1, %{index: &2, name: "#{n}-#{&2}", status: :pending}))
    |> stitch_hooks(stack, false)
  end

  def commands(%Stack{type: :custom, definition: %StackDefinition{name: n, steps: steps}} = stack, _) when is_list(steps) do
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

  defp ansible_commands(%Stack{} = s, true), do: indexed([cmd("plan", "ansible-playbook", ansible_args(s) ++ ["--diff"], :plan)])
  defp ansible_commands(%Stack{deleted_at: d} = s, _) when not is_nil(d), do: ansible_delete_commands(s)
  defp ansible_commands(%Stack{configuration: %{ansible: %Stack.Configuration.Ansible{supports_check: true}}} = s, _) do
    args = ansible_args(s)
    indexed([
      cmd("plan", "ansible-playbook", args ++ ["--diff", "--check"], :plan),
      cmd("apply", "ansible-playbook", args, :apply)
    ])
  end
  defp ansible_commands(%Stack{} = s, _) do
    args = ansible_args(s)
    indexed([cmd("apply", "ansible-playbook", args, :apply)])
  end

  defp ansible_delete_commands(%Stack{configuration: %{ansible: %Stack.Configuration.Ansible{delete_playbook: delete_playbook}}} = s)
        when is_binary(delete_playbook) and byte_size(delete_playbook) > 0 do
    case ansible_args(s) do
      [_ | args] -> indexed([cmd("apply", "ansible-playbook", [delete_playbook | args], :apply)])
      _ -> indexed([cmd("apply", "ansible-playbook", [delete_playbook], :apply)])
    end
  end
  defp ansible_delete_commands(%Stack{} = s), do: ansible_commands(s, true)

  defp ansible_args(%Stack{configuration: %{ansible: %Stack.Configuration.Ansible{} = ansible}}) do
    Enum.filter(
      [ansible.playbook] ++
      (if ansible.inventory, do: ["-i", ansible.inventory], else: []) ++
      (ansible.additional_args || []),
      & &1
    )
  end
  defp ansible_args(_), do: ["main.yaml"]

  defp terraform_commands(%Stack{} = s, true) do
    indexed([
      cmd("init", tf_command(s), ["init", "-upgrade"], :init),
      cmd("plan", tf_command(s), ["plan"], :plan),
    ])
  end

  defp terraform_commands(%Stack{deleted_at: d} = s, _) when not is_nil(d) do
    indexed([
      cmd("init", tf_command(s), ["init", "-upgrade"], :init),
      cmd("plan", tf_command(s), ["plan", "-destroy"], :plan),
      cmd("destroy", tf_command(s), ["destroy", "-auto-approve"], :destroy)
    ])
  end

  defp terraform_commands(%Stack{} = s, _) do
    indexed([
      cmd("init", tf_command(s), ["init", "-upgrade"], :init),
      cmd("plan", tf_command(s), ["plan"], :plan),
      cmd("apply", tf_command(s), ["apply", "terraform.tfplan"], :apply)
    ])
  end

  defp tf_command(%Stack{configuration: %{terraform: %Stack.Configuration.Terraform{tofu: true}}}),
    do: "tofu"
  defp tf_command(_), do: "terraform"

  defp cmd(name, command, args, stage) do
    %{status: :pending, name: name, cmd: command, args: args, stage: stage}
  end

  defp indexed(cmds), do: Enum.with_index(cmds, &Map.put(&1, :index, &2))
end
