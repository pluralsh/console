defmodule Console.Schema.BindingPolicyTest do
  use Console.DataCase, async: true

  alias Console.Schema.BindingPolicy

  describe "match_counts_for_bind_policies/1" do
    test "counts only attachments created by each bind policy" do
      bind_a = insert(:policy, type: :binding)
      bind_b = insert(:policy, type: :binding)
      attached = insert(:policy)
      rule_a = insert(:binding_policy, policy: attached, bind_policy: bind_a, type: :workbench)
      rule_b = insert(:binding_policy, policy: attached, bind_policy: bind_b, type: :workbench)
      insert_list(2, :workbench_policy, policy: attached, binding_policy: rule_a)
      insert(:workbench_policy, policy: attached, binding_policy: rule_b)
      insert(:workbench_policy, policy: attached)

      counts = BindingPolicy.match_counts_for_bind_policies([bind_a.id, bind_b.id])

      assert counts[bind_a.id] == 2
      assert counts[bind_b.id] == 1
    end

    test "includes stack attachments created by the bind policy" do
      bind_policy = insert(:policy, type: :binding)
      attached = insert(:policy, type: :stack)
      rule = insert(:binding_policy, policy: attached, bind_policy: bind_policy, type: :stack)
      insert(:stack_policy, policy: attached, binding_policy: rule)
      insert(:stack_policy, policy: attached)

      counts = BindingPolicy.match_counts_for_bind_policies([bind_policy.id])

      assert counts[bind_policy.id] == 1
    end
  end
end
