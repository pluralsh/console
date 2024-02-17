defmodule Console.GraphQl.UserMutationsTest do
  use Console.DataCase, async: true
  alias Console.Services.Users

  describe "signIn" do
    test "A user can be signed in" do
      {:ok, user} = Users.create_user(%{
        name: "some user",
        email: "email@example.com",
        password: "bogus password"
      })

      {:ok, %{data: %{"signIn" => signin}}} = run_query("""
        mutation SignIn($email: String!, $password: String!) {
          signIn(email: $email, password: $password) {
            id
          }
        }
      """, %{"email" => user.email, "password" => "bogus password"})

      assert signin["id"] == user.id
    end
  end

  describe "loginLink" do
    test "A user can be signed in via a random link" do
      {:ok, user} = Users.create_user(%{
        name: "some user",
        email: "sandbox@plural.sh",
        password: "bogus password"
      })

      {:ok, %{data: %{"loginLink" => signin}}} = run_query("""
        mutation Link($key: String!) {
          loginLink(key: $key) {
            id
            jwt
          }
        }
      """, %{"key" => "test-key"})

      assert signin["id"] == user.id
      assert signin["jwt"]
    end

    test "If links are invalid signin won't work" do
      {:ok, _} = Users.create_user(%{
        name: "some user",
        email: "sandbox@plural.sh",
        password: "bogus password"
      })

      {:ok, %{data: %{"loginLink" => nil}, errors: [_ | _]}} = run_query("""
        mutation Link($key: String!) {
          loginLink(key: $key) {
            id
            jwt
          }
        }
      """, %{"key" => "invalid"})
    end
  end

  describe "updateUser" do
    test "It can update a user's attributes" do
      {:ok, user} = Users.create_user(%{
        name: "some user",
        email: "email@example.com",
        password: "bogus password"
      })

      {:ok, %{data: %{"updateUser" => updated}}} = run_query("""
        mutation UpdateUser($attributes: UserAttributes!) {
          updateUser(attributes: $attributes) {
            name
          }
        }
      """, %{"attributes" => %{"name" => "new name"}}, %{current_user: user})

      assert updated["name"] == "new name"
    end
  end

  describe "createInvite" do
    test "It can create an invite" do
      {:ok, %{data: %{"createInvite" => invite}}} = run_query("""
        mutation CreateInvite($email: String!) {
          createInvite(attributes: {email: $email}) {
            secureId
            email
          }
        }
      """, %{"email" => "someone@example.com"}, %{current_user: insert(:user)})

      assert invite["secureId"]
      assert invite["email"] == "someone@example.com"
    end
  end

  describe "signup" do
    test "It can create a user from an invite" do
      invite = insert(:invite)

      {:ok, %{data: %{"signup" => user}}} = run_query("""
        mutation Signup($invite: String!, $attributes: UserAttributes!) {
          signup(inviteId: $invite, attributes: $attributes) {
            jwt
            email
          }
        }
      """, %{"invite" => invite.secure_id, "attributes" => %{
        "password" => "strong password",
        "name" => "Some User"
      }})

      assert user["jwt"]
      assert user["email"] == invite.email
    end
  end

  describe "deleteUser" do
    test "admins can delete other users" do
      admin = admin_user()
      user = insert(:user)

      {:ok, %{data: %{"deleteUser" => del}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteUser(id: $id) { id }
        }
      """, %{"id" => user.id}, %{current_user: admin})

      assert del["id"] == user.id
      refute refetch(user)
    end

    test "admins cannot delete themselves" do
      admin = admin_user()

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation Delete($id: ID!) {
          deleteUser(id: $id) { id }
        }
      """, %{"id" => admin.id}, %{current_user: admin})

      assert refetch(admin)
    end

    test "cannot delete the console user" do
      admin = admin_user()
      console = insert(:user, bot_name: "console")

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation Delete($id: ID!) {
          deleteUser(id: $id) { id }
        }
      """, %{"id" => console.id}, %{current_user: admin})

      assert refetch(console)
    end

    test "nonadmins cannot delete users" do
      [user, other] = insert_list(2, :user)

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation Delete($id: ID!) {
          deleteUser(id: $id) { id }
        }
      """, %{"id" => other.id}, %{current_user: user})

      assert refetch(user)
    end
  end

  describe "createGroup" do
    test "it can create a group" do
      admin = insert(:user, roles: %{admin: true})
      {:ok, %{data: %{"createGroup" => group}}} = run_query("""
        mutation Create($attrs: GroupAttributes!) {
          createGroup(attributes: $attrs) { id name }
        }
      """, %{"attrs" => %{"name" => "group"}}, %{current_user: admin})

      assert group["id"]
      assert group["name"] == "group"
    end
  end

  describe "updateGroup" do
    test "it can create a group" do
      admin = insert(:user, roles: %{admin: true})
      group = insert(:group)
      {:ok, %{data: %{"updateGroup" => update}}} = run_query("""
        mutation Update($id: ID!, $attrs: GroupAttributes!) {
          updateGroup(groupId: $id, attributes: $attrs) { id name }
        }
      """, %{"id" => group.id, "attrs" => %{"name" => "update"}}, %{current_user: admin})

      assert update["id"] == group.id
      assert update["name"] == "update"
    end
  end

  describe "deleteGroup" do
    test "it can create a group" do
      admin = insert(:user, roles: %{admin: true})
      group = insert(:group)
      {:ok, %{data: %{"deleteGroup" => delete}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteGroup(groupId: $id) { id name }
        }
      """, %{"id" => group.id}, %{current_user: admin})

      assert delete["id"] == group.id
      refute refetch(group)
    end
  end

  describe "createGroupMember" do
    test "it can create a group" do
      admin = insert(:user, roles: %{admin: true})
      group = insert(:group)
      user  = insert(:user)
      {:ok, %{data: %{"createGroupMember" => create}}} = run_query("""
        mutation Create($userId: ID!, $groupId: ID!) {
          createGroupMember(groupId: $groupId, userId: $userId) {
            id
            user { id }
            group { id }
          }
        }
      """, %{"groupId" => group.id, "userId" => user.id}, %{current_user: admin})

      assert create["id"]
      assert create["user"]["id"] == user.id
      assert create["group"]["id"] == group.id
    end
  end

  describe "deleteGroupMember" do
    test "it can create a group" do
      admin = insert(:user, roles: %{admin: true})
      %{user: user, group: group} = group_member = insert(:group_member)
      {:ok, %{data: %{"deleteGroupMember" => delete}}} = run_query("""
        mutation Delete($userId: ID!, $groupId: ID!) {
          deleteGroupMember(groupId: $groupId, userId: $userId) {
            id
            user { id }
            group { id }
          }
        }
      """, %{"groupId" => group.id, "userId" => user.id}, %{current_user: admin})

      assert delete["id"]
      assert delete["user"]["id"] == user.id
      assert delete["group"]["id"] == group.id

      refute refetch(group_member)
    end
  end

  describe "createRole" do
    test "it can create a role" do
      user = insert(:user, roles: %{admin: true})

      {:ok, %{data: %{"createRole" => role}}} = run_query("""
        mutation Create($attrs: RoleAttributes!) {
          createRole(attributes: $attrs) {
            name
            permissions
            repositories
            roleBindings { user { id } }
          }
        }
      """, %{
        "attrs" => %{
          "name" => "role",
          "permissions" => ["READ"],
          "repositories" => ["*"],
          "roleBindings" => [%{"userId" => user.id}]
        }
      }, %{current_user: user})

      assert role["name"] == "role"
      assert role["permissions"] == ["READ"]
      assert role["repositories"] == ["*"]
      assert hd(role["roleBindings"])["user"]["id"] == user.id
    end
  end

  describe "updateRole" do
    test "it can update a role" do
      user = insert(:user, roles: %{admin: true})
      role = insert(:role)

      {:ok, %{data: %{"updateRole" => role}}} = run_query("""
        mutation Update($id: ID!, $attrs: RoleAttributes!) {
          updateRole(id: $id, attributes: $attrs) {
            roleBindings { user { id } }
          }
        }
      """, %{"id" => role.id, "attrs" => %{"roleBindings" => [%{"userId" => user.id}]}}, %{current_user: user})

      assert hd(role["roleBindings"])["user"]["id"] == user.id
    end
  end

  describe "deleteRole" do
    test "deletes a role" do
      user = insert(:user, roles: %{admin: true})
      role = insert(:role)

      {:ok, %{data: %{"deleteRole" => deleted}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteRole(id: $id) {
            id
          }
        }
      """, %{"id" => role.id}, %{current_user: user})

      assert deleted["id"] == role.id
      refute refetch(role)
    end
  end

  describe "readNotifications" do
    test "it can set a read timestamp" do
      user = insert(:user)

      {:ok, %{data: %{"readNotifications" => read}}} = run_query("""
        mutation {
          readNotifications {
            readTimestamp
          }
        }
      """, %{}, %{current_user: user})

      assert read["readTimestamp"]
    end
  end

  describe "markRead" do
    test "it can mark the build timestamp for a user" do
      user = insert(:user)

      {:ok, %{data: %{"markRead" => read}}} = run_query("""
        mutation Read($type: ReadType) {
          markRead(type: $type) { buildTimestamp }
        }
      """, %{"type" => "BUILD"}, %{current_user: user})

      assert read["buildTimestamp"]
    end
  end

  describe "createAccessToken" do
    test "it can create a new access token" do
      user = insert(:user)

      {:ok, %{data: %{"createAccessToken" => token}}} = run_query("""
        mutation {
          createAccessToken { id token }
        }
      """, %{}, %{current_user: user})

      assert token["id"]
      assert token["token"]
    end
  end

  describe "deleteAccessToken" do
    test "it can delete a user's access token" do
      token = insert(:access_token)

      {:ok, %{data: %{"deleteAccessToken" => deleted}}} = run_query("""
        mutation delete($token: String!) {
          deleteAccessToken(token: $token) { id }
        }
      """, %{"token" => token.token}, %{current_user: token.user})

      assert deleted["id"] == token.id
      refute refetch(token)
    end

    test "it cannot delete other user's access token" do
      token = insert(:access_token)

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation delete($token: String!) {
          deleteAccessToken(token: $token) { id }
        }
      """, %{"token" => token.token}, %{current_user: insert(:user)})

      assert refetch(token)
    end
  end

  describe "createServiceAccount" do
    test "admins can create service accounts" do
      admin = admin_user()

      {:ok, %{data: %{"createServiceAccount" => svc}}} = run_query("""
        mutation create($attrs: ServiceAccountAttributes!) {
          createServiceAccount(attributes: $attrs) { name }
        }
      """, %{"attrs" => %{"name" => "name", "email" => "someone@example.com"}}, %{current_user: admin})

      assert svc["name"] == "name"
    end

    test "nonadmins cannot create service accounts" do
      admin = insert(:user)

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation create($attrs: ServiceAccountAttributes!) {
          createServiceAccount(attributes: $attrs) { name }
        }
      """, %{"attrs" => %{"name" => "name", "email" => "someone@example.com"}}, %{current_user: admin})
    end
  end

  describe "createServiceAccountToken" do
    test "admins can create service accounts" do
      admin = admin_user()
      svc = insert(:user, service_account: true)

      {:ok, %{data: %{"createServiceAccountToken" => token}}} = run_query("""
        mutation create($id: ID!) {
          createServiceAccountToken(id: $id) { token }
        }
      """, %{"id" => svc.id}, %{current_user: admin})

      assert token["token"]
    end

    test "nonadmins cannot create service accounts" do
      admin = insert(:user)
      svc = insert(:user, service_account: true)

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation create($id: ID!) {
          createServiceAccountToken(id: $id) { token }
        }
      """, %{"id" => svc.id}, %{current_user: admin})
    end
  end

  describe "createPersona" do
    test "admins can create a persona" do
      group = insert(:group)
      {:ok, %{data: %{"createPersona" => persona}}} = run_query("""
        mutation Create($attrs: PersonaAttributes!) {
          createPersona(attributes: $attrs) {
            id
            bindings { group { id } }
          }
        }
      """, %{"attrs" => %{
        "name" => "some-persona",
        "bindings" => [%{"groupId" => group.id}],
      }}, %{current_user: admin_user()})

      assert persona["id"]
      assert hd(persona["bindings"])["group"]["id"] == group.id
    end

    test "nonadmins cannot create a persona" do
      group = insert(:group)
      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation Create($attrs: PersonaAttributes!) {
          createPersona(attributes: $attrs) {
            id
            bindings { group { id } }
          }
        }
      """, %{"attrs" => %{
        "name" => "some-persona",
        "bindings" => [%{"groupId" => group.id}],
      }}, %{current_user: insert(:user)})
    end
  end

  describe "updatePersona" do
    test "admins can update a persona" do
      group = insert(:group)
      persona = insert(:persona)
      {:ok, %{data: %{"updatePersona" => updated}}} = run_query("""
        mutation Update($id: ID!, $attrs: PersonaAttributes!) {
          updatePersona(id: $id, attributes: $attrs) {
            id
            bindings { group { id } }
          }
        }
      """, %{"id" => persona.id, "attrs" => %{
        "name" => "some-persona",
        "bindings" => [%{"groupId" => group.id}],
      }}, %{current_user: admin_user()})

      assert updated["id"] == persona.id
      assert hd(updated["bindings"])["group"]["id"] == group.id
    end

    test "nonadmins cannot update a persona" do
      group = insert(:group)
      persona = insert(:persona)
      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation Update($id: ID!, $attrs: PersonaAttributes!) {
          updatePersona(id: $id, attributes: $attrs) {
            id
            bindings { group { id } }
          }
        }
      """, %{"id" => persona.id, "attrs" => %{
        "name" => "some-persona",
        "bindings" => [%{"groupId" => group.id}],
      }}, %{current_user: insert(:user)})
    end
  end

  describe "deletePersona" do
    test "admins can delete a persona" do
      persona = insert(:persona)
      {:ok, %{data: %{"deletePersona" => deleted}}} = run_query("""
        mutation Create($id: ID!) {
          deletePersona(id: $id) {
            id
          }
        }
      """, %{"id" => persona.id}, %{current_user: admin_user()})

      assert deleted["id"] == persona.id
    end

    test "nonadmins cannot delete a persona" do
      persona = insert(:persona)
      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation Delete($id: ID) {
          deletePersona(id: $id) {
            id
          }
        }
      """, %{"id" => persona.id}, %{current_user: insert(:user)})
    end
  end
end
