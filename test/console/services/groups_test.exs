defmodule Console.Services.GroupsTest do
  use Console.DataCase, async: true
  alias Console.Services.Users

  describe "#create_group/2" do
    test "it can create a new group" do
      {:ok, group} = Users.create_group(%{name: "test", description: "description"})

      assert group.name == "test"
      assert group.description == "description"
    end

    test "it will backfill users in global groups" do
      users = insert_list(3, :user)

      {:ok, group} = Users.create_group(%{name: "global", global: true})

      assert group.global
      for user <- users,
        do: assert Users.get_group_member(group.id, user.id)
    end

    test "it can create a group with initial user ids" do
      user1 = insert(:user)
      user2 = insert(:user)
      user3 = insert(:user)

      {:ok, group} = Users.create_group(
        %{name: "test-with-users", description: "test"},
        [user1.id, user2.id]
      )

      assert group.name == "test-with-users"
      assert Users.get_group_member(group.id, user1.id)
      assert Users.get_group_member(group.id, user2.id)
      refute Users.get_group_member(group.id, user3.id)
    end

    test "it fails if any user id does not exist" do
      user = insert(:user)
      missing_id = Ecto.UUID.generate()

      {:error, %Ecto.Changeset{}} = Users.create_group(
        %{name: "test-missing-user"},
        [user.id, missing_id]
      )

      # Verify the group was not created (transaction rolled back)
      refute Users.get_group_by_name("test-missing-user")
    end

    test "it fails if any user id is not a UUID" do
      user = insert(:user)

      {:error, %Ecto.Changeset{errors: errors}} = Users.create_group(
        %{name: "test-invalid-id"},
        [user.id, "tes"]
      )

      assert {"invalid uuid", _} = Keyword.fetch!(errors, :user_id)
      # Verify the group was not created (transaction rolled back)
      refute Users.get_group_by_name("test-invalid-id")
    end

    test "it handles empty user_ids list" do
      {:ok, group} = Users.create_group(%{name: "test-empty"}, [])

      assert group.name == "test-empty"
    end

    test "it handles nil user_ids" do
      {:ok, group} = Users.create_group(%{name: "test-nil"}, nil)

      assert group.name == "test-nil"
    end

    test "global groups add all users plus any specified user_ids" do
      user1 = insert(:user)
      user2 = insert(:user)
      user3 = insert(:user)

      {:ok, group} = Users.create_group(
        %{name: "global-with-ids", global: true},
        [user1.id]
      )

      assert group.global
      # All users should be added (global adds all, user_ids is redundant but doesn't fail)
      assert Users.get_group_member(group.id, user1.id)
      assert Users.get_group_member(group.id, user2.id)
      assert Users.get_group_member(group.id, user3.id)
    end
  end

  describe "#update_group/2" do
    test "it can update a group's name" do
      group = insert(:group)
      {:ok, updated} = Users.update_group(%{name: "updated"}, group.id)

      assert updated.name == "updated"
    end

    test "it adds all users when a group becomes global" do
      group = insert(:group, global: false)
      user1 = insert(:user)
      user2 = insert(:user)

      refute Users.get_group_member(group.id, user1.id)
      refute Users.get_group_member(group.id, user2.id)

      {:ok, updated} = Users.update_group(%{global: true}, group.id)

      assert updated.global
      assert Users.get_group_member(group.id, user1.id)
      assert Users.get_group_member(group.id, user2.id)
    end

    test "it does not duplicate members when a group with existing members becomes global" do
      group = insert(:group, global: false)
      user1 = insert(:user)
      user2 = insert(:user)

      # Add user1 as an existing member
      {:ok, _} = Users.create_group_member(%{user_id: user1.id}, group.id)
      assert Users.get_group_member(group.id, user1.id)

      {:ok, updated} = Users.update_group(%{global: true}, group.id)

      assert updated.global
      # Both users should be members
      assert Users.get_group_member(group.id, user1.id)
      assert Users.get_group_member(group.id, user2.id)

      # Verify no duplicates by counting members
      member_count = Console.Schema.GroupMember
                    |> Console.Schema.GroupMember.for_group(group.id)
                    |> Console.Repo.aggregate(:count)
      assert member_count == 2
    end

    test "it does nothing when updating a group that is already global" do
      users = insert_list(2, :user)
      {:ok, group} = Users.create_group(%{name: "already-global", global: true})

      # All users should already be members
      for user <- users,
        do: assert Users.get_group_member(group.id, user.id)

      {:ok, updated} = Users.update_group(%{description: "updated description"}, group.id)

      assert updated.description == "updated description"
      assert updated.global
    end

    test "it does not remove members when a group is no longer global" do
      users = insert_list(2, :user)
      {:ok, group} = Users.create_group(%{name: "was-global", global: true})

      # All users should be members
      for user <- users,
        do: assert Users.get_group_member(group.id, user.id)

      {:ok, updated} = Users.update_group(%{global: false}, group.id)

      refute updated.global
      # Members should still exist
      for user <- users,
        do: assert Users.get_group_member(group.id, user.id)
    end
  end

  describe "#delete_group/1" do
    test "it can delete a group" do
      group = insert(:group)
      {:ok, deleted} = Users.delete_group(group.id)

      assert deleted.id == group.id
      refute refetch(deleted)
    end
  end

  describe "#create_group_member/2" do
    test "it can create a group member" do
      group = insert(:group)
      user = insert(:user)
      {:ok, member} = Users.create_group_member(%{user_id: user.id}, group.id)

      assert member.user_id == user.id
      assert member.group_id == group.id
    end

    test "it is idempotent" do
      group = insert(:group)
      user = insert(:user)

      {:ok, member1} = Users.create_group_member(%{user_id: user.id}, group.id)
      {:ok, member2} = Users.create_group_member(%{user_id: user.id}, group.id)

      assert member1.id == member2.id
    end
  end

  describe "#delete_group_member/2" do
    test "it can delete a group member" do
      member = insert(:group_member)
      {:ok, deleted} = Users.delete_group_member(member.group_id, member.user_id)

      assert deleted.id == member.id
      refute refetch(deleted)
    end
  end
end
