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
    @tag :skip
    test "It can determine the upgrade type for a repository" do
      insert(:upgrade_policy, target: "repo", type: :approval, weight: 10)
      insert(:upgrade_policy, target: "ignore")
      insert(:upgrade_policy, target: "repo", weight: 0)

      :approval = Policies.upgrade_type("repo")
    end
  end

  describe "#matches?/2" do
    test "if a policy has non-empty repositories, it will use those for a match" do
      policy = insert(:upgrade_policy, target: "*", repositories: ["console"])

      refute Policies.matches?("airbyte", policy)
      assert Policies.matches?("console", policy)
    end

    test "if a policy includes a wildcard, it will match anything" do
      policy = insert(:upgrade_policy, target: "*")

      for r <- ~w(any repository name) do
        assert Policies.matches?(r, policy)
      end
    end

    test "if a policy target is prefixed with ~ it will evaluate a regex" do
      policy = insert(:upgrade_policy, target: "~con.*ole")

      assert Policies.matches?("console", policy)
      assert Policies.matches?("conbogusole", policy)
      refute Policies.matches?("airbyte", policy)
    end
  end
end
