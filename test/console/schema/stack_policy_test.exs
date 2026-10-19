defmodule Console.Schema.StackPolicyTest do
  use Console.DataCase, async: true

  alias Console.Schema.StackPolicy

  describe "changeset/2" do
    test "a binding can own only one attachment per stack" do
      stack = insert(:stack)
      policy = insert(:policy, type: :stack)
      binding = insert(:binding_policy, policy: policy, type: :stack)
      insert(:stack_policy, stack: stack, policy: policy, binding_policy: binding, type: :run)

      {:error, changeset} =
        %StackPolicy{stack_id: stack.id}
        |> StackPolicy.changeset(%{
          policy_id: policy.id,
          binding_policy_id: binding.id,
          type: :approval
        })
        |> Repo.insert()

      assert errors_on(changeset).binding_policy_id == ["has already been taken"]
    end

    test "allows the same binding to attach to different stacks" do
      policy = insert(:policy, type: :stack)
      binding = insert(:binding_policy, policy: policy, type: :stack)
      first = insert(:stack)
      second = insert(:stack)
      insert(:stack_policy, stack: first, policy: policy, binding_policy: binding, type: :run)

      {:ok, _} =
        %StackPolicy{stack_id: second.id}
        |> StackPolicy.changeset(%{
          policy_id: policy.id,
          binding_policy_id: binding.id,
          type: :run
        })
        |> Repo.insert()
    end

    test "allows multiple manual attachments on the same stack" do
      stack = insert(:stack)
      policy = insert(:policy, type: :stack)
      insert(:stack_policy, stack: stack, policy: policy, type: :run)

      {:ok, _} =
        %StackPolicy{stack_id: stack.id}
        |> StackPolicy.changeset(%{policy_id: policy.id, type: :approval})
        |> Repo.insert()
    end
  end
end
