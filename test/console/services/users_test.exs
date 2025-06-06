defmodule Console.Services.UsersTest do
  use Console.DataCase, async: true
  alias Console.PubSub
  alias Console.Services.{Users}

  describe "#login_user/2" do
    test "It will log in a user by email/pwd" do
      {:ok, user} = Users.create_user(%{
        name: "Some user",
        email: "user@example.com",
        password: "bogus password"
      })

      {:ok, _} = Users.login_user("user@example.com", "bogus password")

      assert Console.Schema.RefreshToken.for_user(user.id) |> Console.Repo.exists?()

      {:error, _} = Users.login_user("user@example.com", "incorrect")
    end

    test "Disabled users are not allowed to log in" do
      {:ok, _user} = Users.create_user(%{
        name: "Some user",
        email: "user@example.com",
        password: "bogus password",
        deleted_at: Timex.now()
      })

      {:error, _} = Users.login_user("user@example.com", "bogus password")
    end
  end

  describe "create_invite/1" do
    test "it can create an invite link" do
      {:ok, invite} = Users.create_invite(%{email: "someone@example.com"})

      assert invite.secure_id
    end
  end

  describe "#create_user/2" do
    test "A user can be created by invite token" do
      invite = insert(:invite)

      {:ok, user} = Users.create_user(%{
        password: "strong password",
        name: "some user"
      }, invite.secure_id)

      assert user.email == invite.email
    end
  end

  describe "#bootstrap_user/2" do
    setup do
      on_exit(fn ->
        Application.put_env(:console, :org_email_suffix, "")
      end)
    end

    test "keeps email unchanged when no suffix is configured" do
      Application.put_env(:console, :org_email_suffix, "")

      {:ok, user} = Users.bootstrap_user(%{
        "email" => "someone@example.com",
        "name" => "Some User"
      })

      assert user.email == "someone@example.com"
    end

    test "removes org suffix from email when ORG_EMAIL_SUFFIX is set" do
      Application.put_env(:console, :org_email_suffix, "+testorg")

      {:ok, user} = Users.bootstrap_user(%{
        "email" => "someone+testorg@example.com",
        "name" => "Some User"
      })

      assert user.email == "someone@example.com"
    end

    test "if the user doesn't exist, it will create one" do
      {:ok, user} = Users.bootstrap_user(%{
        "email" => "someone@example.com",
        "name" => "Some User",
        "profile" => "https://some.image.com",
        "groups" => ["general"],
        "admin" => true,
        "plural_id" => "abcdef-123456789-ghijkl"
      })

      assert user.name == "Some User"
      assert user.email == "someone@example.com"
      assert user.profile == "https://some.image.com"
      assert user.plural_id == "abcdef-123456789-ghijkl"
      assert user.roles.admin

      group = Users.get_group_by_name("general")
      assert group.description == "synced from your OpenId Connect provider by Plural"

      assert Users.get_group_member(group.id, user.id)
    end

    test "if the user is in the admin list, they'll become an admin" do
      {:ok, user} = Users.bootstrap_user(%{
        "email" => "admin@example.com",
        "name" => "Some User",
        "profile" => "https://some.image.com",
        "groups" => ["general"],
      })

      assert user.name == "Some User"
      assert user.email == "admin@example.com"
      assert user.profile == "https://some.image.com"
      assert user.roles.admin

      group = Users.get_group_by_name("general")
      assert group.description == "synced from your OpenId Connect provider by Plural"

      assert Users.get_group_member(group.id, user.id)

      {:ok, user} = Users.bootstrap_user(%{
        "email" => "regular@example.com",
        "name" => "Some User",
        "profile" => "https://some.image.com",
        "groups" => ["general"],
      })

      assert user.name == "Some User"
      assert user.email == "regular@example.com"
      assert user.profile == "https://some.image.com"
      refute user.roles
    end

    test "it is robust to duplicate group names" do
      {:ok, user} = Users.bootstrap_user(%{
        "email" => "someone@example.com",
        "name" => "Some User",
        "profile" => "https://some.image.com",
        "groups" => ["general", "general"],
        "admin" => true,
        "plural_id" => "abcdef-123456789-ghijkl"
      })

      assert user.name == "Some User"
      assert user.email == "someone@example.com"
      assert user.profile == "https://some.image.com"
      assert user.plural_id == "abcdef-123456789-ghijkl"
      assert user.roles.admin

      group = Users.get_group_by_name("general")
      assert group.description == "synced from your OpenId Connect provider by Plural"

      assert Users.get_group_member(group.id, user.id)
    end

    test "If the user already exists, they will be returned" do
      user = insert(:user, email: "existing@example.com")

      {:ok, found} = Users.bootstrap_user(%{
        "email" => "existing@example.com",
        "name" => user.name,
        "profile" => "some.profile.com",
        "plural_id" => "abcdef-123456789-ghijkl"
      })

      assert found.id == user.id
      assert found.profile == "some.profile.com"
      assert found.plural_id == "abcdef-123456789-ghijkl"
    end
  end

  describe "update_user/2" do
    test "It can update a user" do
      user = insert(:user)

      {:ok, updated} = Users.update_user(%{password: "bogus password"}, user)

      assert updated.password_hash
    end

    test "admins can update other users" do
      admin = insert(:user, roles: %{admin: true})
      user  = insert(:user)

      {:ok, updated} = Users.update_user(%{roles: %{admin: true}}, user.id, admin)

      assert updated.id == user.id
    end

    test "users cannot make themselves admins" do
      user = insert(:user)

      {:error, _} = Users.update_user(%{roles: %{admin: true}}, user.id, user)
    end

    test "nonadmins cannot update other users" do
      actor = insert(:user)
      user  = insert(:user)

      {:error, :forbidden} = Users.update_user(%{roles: %{admin: true}}, user.id, actor)
    end
  end

  describe "create_user/2" do
    test "It can create a new user" do
      {:ok, user} = Users.create_user(%{
        name: "Some user",
        email: "user@example.com",
        password: "bogus password"
      })

      assert user.name == "Some user"
      assert user.email == "user@example.com"

      assert_receive {:event, %PubSub.UserCreated{item: ^user}}
    end
  end

  describe "#create_group/2" do
    test "it can create a new group" do
      {:ok, group} = Users.create_group(%{name: "group", description: "description"})

      assert group.name == "group"
      assert group.description == "description"
    end

    test "it will backfill users in global groups" do
      users = insert_list(3, :user)

      {:ok, group} = Users.create_group(%{name: "global", global: true})

      assert group.global
      for user <- users,
        do: assert Users.get_group_member(group.id, user.id)
    end
  end

  describe "#delete_group/2" do
    test "it can create a new group" do
      group = insert(:group)
      {:ok, del} = Users.delete_group(group.id)

      assert del.id == group.id
      refute refetch(del)
    end
  end

  describe "#update_group/2" do
    test "it can create a new group" do
      group = insert(:group)
      {:ok, del} = Users.update_group(%{name: "update"}, group.id)

      assert del.name == "update"
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
  end

  describe "#delete_group_member/2" do
    test "it can delete a group member" do
      member = insert(:group_member)
      {:ok, del} = Users.delete_group_member(member.group_id, member.user_id)

      assert del.id == member.id
      refute refetch(del)
    end
  end

  describe "#disable_user/2" do
    test "It can disable a user if specified" do
      {:ok, user} = Users.create_user(%{
        name: "Some user",
        email: "user@example.com",
        password: "bogus password"
      })

      {:ok, disabled} = Users.disable_user(user.id, true, user)

      assert disabled.deleted_at
    end

    test "It can wipe disabled state" do
      {:ok, user} = Users.create_user(%{
        name: "Some user",
        email: "user@example.com",
        password: "bogus password",
        deleted_at: Timex.now()
      })

      {:ok, enabled} = Users.disable_user(user.id, false, user)

      refute enabled.deleted_at
    end
  end

  describe "#create_role/1" do
    test "it can create a role" do
      group = insert(:group)
      user = insert(:user)

      {:ok, role} = Users.create_role(%{
        name: "role",
        repositories: ["*"],
        permissions: %{read: true},
        role_bindings: [%{user_id: user.id}, %{group_id: group.id}]
      })

      assert role.name == "role"
      assert role.repositories == ["*"]

      [first, second] = role.role_bindings
      assert first.user_id == user.id
      assert second.group_id == group.id
    end
  end

  describe "#update_role/2" do
    test "It can update a role" do
      user  = insert(:user)
      group = insert(:group)
      role  = insert(:role, permissions: %{read: true})
      insert(:role_binding, role: role, user: user)

      {:ok, %{role_bindings: [binding]} = updated} = Users.update_role(%{
        permissions: %{operate: true},
        role_bindings: [%{group_id: group.id}]
      }, role.id)

      assert updated.id == role.id
      assert updated.permissions.operate
      assert binding.group_id == group.id
    end
  end

  describe "#delete_role/1" do
    test "deletes a role" do
      role = insert(:role)

      {:ok, deleted} = Users.delete_role(role.id)

      assert deleted.id == role.id
      refute refetch(deleted)
    end
  end

  describe "#mark_read/1" do
    test "it will set a users read timestamp" do
      user = insert(:user)

      {:ok, updated} = Users.mark_read(user)

      assert updated.id == user.id
      assert updated.read_timestamp
    end
  end

  describe "#create_access_token/1" do
    test "a user can create an access token for themselves" do
      user = insert(:user)

      {:ok, token} = Users.create_access_token(user)

      assert token.token
      assert token.user_id == user.id
    end

    test "a user can create an access token with scopes" do
      user = insert(:user)

      {:ok, token} = Users.create_access_token(%{
        scopes: [%{api: "updateServiceDeployment", identifier: Ecto.UUID.generate()}]
      }, user)

      assert token.token
      assert token.user_id == user.id
      [scope] = token.scopes
      assert scope.api == "updateServiceDeployment"
    end
  end

  describe "#delete_access_token/2" do
    test "a user can delete their token" do
      token = insert(:access_token)

      {:ok, deleted} = Users.delete_access_token(token.token, token.user)

      assert deleted.id == token.id
      refute refetch(token)
    end

    test "you cannot delete others tokens" do
      token = insert(:access_token)

      {:error, _} = Users.delete_access_token(token.token, insert(:user))
    end
  end

  describe "delete_access_token_by_id/2" do
    test "a user can delete their token by id" do
      token = insert(:access_token)

      {:ok, deleted} = Users.delete_access_token_by_id(token.id, token.user)

      assert deleted.id == token.id
      refute refetch(token)
    end

    test "you cannot delete others tokens by id" do
      token = insert(:access_token)

      {:error, _} = Users.delete_access_token_by_id(token.id, insert(:user))
    end
  end

  describe "#create_bootstrap_token/2" do
    test "admins can create bootstrap tokens" do
      admin = admin_user()
      project = insert(:project)

      {:ok, token} = Users.create_bootstrap_token(%{project_id: project.id}, admin)

      assert token.token
      assert token.project_id == project.id
      assert token.user_id == admin.id
    end

    test "project writers can create bootstrap tokens" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])

      {:ok, token} = Users.create_bootstrap_token(%{project_id: project.id}, user)

      assert token.token
      assert token.project_id == project.id
      assert token.user_id == user.id
    end

    test "non writers cannot create" do
      user = insert(:user)
      project = insert(:project)

      {:error, _} = Users.create_bootstrap_token(%{project_id: project.id}, user)
    end
  end

  describe "#delete_bootstrap_token/2" do
    test "admins can delete bootstrap tokens" do
      admin = admin_user()
      bootstrap = insert(:bootstrap_token)

      {:ok, token} = Users.delete_bootstrap_token(bootstrap.id, admin)

      assert token.id == bootstrap.id
      refute refetch(bootstrap)
    end

    test "project writers can delete bootstrap tokens" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      bootstrap = insert(:bootstrap_token, project: project)

      {:ok, token} = Users.delete_bootstrap_token(bootstrap.id, user)

      assert token.id == bootstrap.id
      refute refetch(bootstrap)
    end

    test "non writers cannot delete" do
      user = insert(:user)
      project = insert(:project)
      bootstrap = insert(:bootstrap_token, project: project)

      {:error, _} = Users.delete_bootstrap_token(bootstrap.id, user)
    end
  end
end
