defmodule Console.Services.PoliciesTest do
  use Console.DataCase, async: true
  alias Console.Services.Policies
  alias Console.PubSub

  describe "#create_upgrade_policy/2" do
    test "An admin can create upgrade policies" do
      admin = insert(:user, roles: %{admin: true})

      {:ok, policy} = Policies.create_upgrade_policy(%{
        name: "policy",
        target: "repo",
        type: :deploy,
      }, admin)

      assert policy.name == "policy"
      assert policy.target == "repo"
      assert policy.type == :deploy

      assert_receive {:event, %PubSub.UpgradePolicyCreated{item: ^policy}}
    end

    test "regular users cannot create" do
      user = insert(:user)

      {:error, :forbidden} = Policies.create_upgrade_policy(%{
        name: "policy",
        target: "repo",
        type: :deploy,
      }, user)
    end
  end

  describe "#delete_upgrade_policy/2" do
    test "admins can delete upgrade policies" do
      policy = insert(:upgrade_policy)
      admin  = insert(:user, roles: %{admin: true})

      {:ok, del} = Policies.delete_upgrade_policy(policy.id, admin)

      refute refetch(policy)

      assert_receive {:event, %PubSub.UpgradePolicyDeleted{item: ^del}}
    end

    test "regular users cannot delete" do
      policy = insert(:upgrade_policy)
      user   = insert(:user)

      {:error, :forbidden} = Policies.delete_upgrade_policy(policy.id, user)
    end
  end

  describe "#upgrade_type/1" do
    test "It can determine the upgrade type for a repository" do
      policy = insert(:upgrade_policy, target: "repo", type: :approval, weight: 10)
      insert(:upgrade_policy, target: "ignore")
      insert(:upgrade_policy, target: "repo", weight: 0)

      :approval = Policies.upgrade_type("repo")
    end
  end
end
