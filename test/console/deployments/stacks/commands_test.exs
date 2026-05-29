defmodule Console.Deployments.Stacks.CommandsTest do
  use Console.DataCase, async: true
  alias Console.Deployments.Stacks.Commands
  alias Console.Schema.Stack

  describe "commands/2" do
    test "uses terragrunt for terragrunt stacks" do
      commands =
        %Stack{type: :terragrunt}
        |> Commands.commands()

      assert Enum.map(commands, &Map.take(&1, [:name, :cmd, :args, :stage])) == [
        %{name: "plan", cmd: "terragrunt", args: ["plan"], stage: :plan},
        %{name: "apply", cmd: "terragrunt", args: ["apply", "terraform.tfplan"], stage: :apply}
      ]
    end

    test "uses terragrunt for terragrunt destroy runs" do
      commands =
        %Stack{type: :terragrunt, deleted_at: DateTime.utc_now()}
        |> Commands.commands()

      assert Enum.map(commands, &Map.take(&1, [:name, :cmd, :args, :stage])) == [
        %{name: "plan", cmd: "terragrunt", args: ["plan", "-destroy"], stage: :plan},
        %{name: "destroy", cmd: "terragrunt", args: ["destroy", "-auto-approve"], stage: :destroy}
      ]
    end
  end
end
