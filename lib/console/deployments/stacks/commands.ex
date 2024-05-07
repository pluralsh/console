defmodule Console.Deployments.Stacks.Commands do
  alias Console.Schema.{Stack}

  def commands(%Stack{type: :terraform} = stack, dry \\ false), do: terraform_commands(stack, dry)

  defp terraform_commands(%Stack{}, true) do
    indexed([
      cmd("init", "terraform", ["init", "-upgrade"], :plan),
      cmd("plan", "terraform", ["plan"], :plan),
    ])
  end

  defp terraform_commands(%Stack{deleted_at: d}, _) when not is_nil(d) do
    indexed([
      cmd("init", "terraform", ["init", "-upgrade"], :plan),
      cmd("destroy", "terraform", ["destroy", "-auto-approve"], :apply)
    ])
  end

  defp terraform_commands(%Stack{}, _) do
    indexed([
      cmd("init", "terraform", ["init", "-upgrade"], :plan),
      cmd("plan", "terraform", ["plan"], :plan),
      cmd("apply", "terraform", ["apply"], :apply)
    ])
  end

  defp cmd(name, command, args, stage) do
    %{status: :pending, name: name, cmd: command, args: args, stage: stage}
  end

  defp indexed(cmds), do: Enum.with_index(cmds, &Map.put(&1, :index, &2))
end
