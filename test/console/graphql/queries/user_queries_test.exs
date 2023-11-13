defmodule Console.GraphQl.UserQueriesTest do
  use Console.DataCase, async: true
  use Mimic

  describe "users" do
    test "It can list all watchman users" do
      users = insert_list(3, :user)

      {:ok, %{data: %{"users" => found}}} = run_query("""
        query {
          users(first: 5) {
            edges {  node { id } }
          }
        }
      """, %{}, %{current_user: hd(users)})

      assert from_connection(found)
             |> ids_equal(users)
    end

    test "it can search for users" do
      user = insert(:user, name: "search")
      insert_list(2, :user)

      {:ok, %{data: %{"users" => found}}} = run_query("""
        query Search($q: String) {
          users(q: $q, first: 5) {
            edges { node { id } }
          }
        }
      """, %{"q" => "search"}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([user])
    end
  end

  describe "me" do
    test "it can query unread notifications" do
      me = insert(:user, read_timestamp: Timex.now() |> Timex.shift(minutes: -1))
      insert_list(3, :notification)
      insert(:notification, updated_at: Timex.now() |> Timex.shift(minutes: -5))

      {:ok, %{data: %{"me" => found}}} = run_query("""
        query {
          me { unreadNotifications }
        }
      """, %{}, %{current_user: me})

      assert found["unreadNotifications"] == 3
    end
  end

  describe "invite" do
    test "It can fetch an invite by secure id" do
      invite = insert(:invite, secure_id: "secure")

      {:ok, %{data: %{"invite" => found}}} = run_query("""
        query Invite($id: String!) {
          invite(id: $id) { email }
        }
      """, %{"id" => "secure"})

      assert found["email"] == invite.email
    end
  end

  describe "groups" do
    test "it can list groups" do
      groups = insert_list(3, :group)

      {:ok, %{data: %{"groups" => found}}} = run_query("""
        query {
          groups(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal(groups)
    end

    test "it can search for groups" do
      group = insert(:group, name: "search")
      insert_list(2, :group)

      {:ok, %{data: %{"groups" => found}}} = run_query("""
        query Search($q: String) {
          groups(q: $q, first: 5) {
            edges { node { id } }
          }
        }
      """, %{"q" => "search"}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal([group])
    end
  end


  describe "groupMembers" do
    test "it can list groups" do
      group = insert(:group)
      members = insert_list(3, :group_member, group: group)

      {:ok, %{data: %{"groupMembers" => found}}} = run_query("""
        query Members($id: ID!) {
          groupMembers(groupId: $id, first: 5) {
            edges { node { id } }
          }
        }
      """, %{"id" => group.id}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal(members)
    end
  end

  describe "roles" do
    test "it can list roles" do
      roles = insert_list(3, :role)

      {:ok, %{data: %{"roles" => found}}} = run_query("""
        query {
          roles(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal(roles)
    end

    test "it can search roles by name" do
      insert_list(3, :role)
      role = insert(:role, name: "query")

      {:ok, %{data: %{"roles" => %{"edges" => [%{"node" => found}]}}}} = run_query("""
        query Search($q: String) {
          roles(first: 5, q: $q) {
            edges { node { id } }
          }
        }
      """, %{"q" => "quer"}, %{current_user: insert(:user)})

      assert found["id"] == role.id
    end
  end

  describe "externalToken" do
    test "it can fetch an external token for the plural user" do
      expect(HTTPoison, :post, fn _, _, _ ->
        {:ok, %{body: Poison.encode!(%{data: %{externalToken: "external-token"}})}}
      end)
      user = insert(:user)

      {:ok, %{data: %{"externalToken" => token}}} = run_query("""
        query { externalToken }
      """, %{}, %{current_user: user})

      assert token == "external-token"
    end
  end

  describe "configuration" do
    test "it can fetch the server's configuration" do
      {:ok, %{data: %{"configuration" => conf}}} = run_query("""
        query {
          configuration { gitCommit }
        }
      """, %{})

      assert conf["gitCommit"]
    end
  end

  describe "temporaryToken" do
    test "admins can issue temp tokens" do
      user = insert(:user, roles: %{admin: true})

      {:ok, %{data: %{"temporaryToken" => token}}} = run_query("""
        query { temporaryToken }
      """, %{}, %{current_user: user})

      {:ok, found, _} = Console.Guardian.resource_from_token(token)

      assert found.id == user.id
    end

    test "non-admins cannot issue temp tokens" do
      user = insert(:user)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query { temporaryToken }
      """, %{}, %{current_user: user})
    end
  end

  describe "notifications" do
    test "it will list notifications for this instance" do
      notifs = insert_list(3, :notification)

      {:ok, %{data: %{"notifications" => found}}} = run_query("""
        query {
          notifications(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal(notifs)
    end

    test "it will filter read notifications" do
      user = insert(:user, read_timestamp: Timex.now() |> Timex.shift(minutes: -2))
      insert(:notification, updated_at: Timex.now() |> Timex.shift(minutes: -4))
      notifs = insert_list(3, :notification, updated_at: Timex.now())

      {:ok, %{data: %{"notifications" => found}}} = run_query("""
        query {
          notifications(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal(notifs)
    end

    test "it will not filter read if all: true is passed" do
      user = insert(:user, read_timestamp: Timex.now() |> Timex.shift(minutes: -2))
      read = insert(:notification, updated_at: Timex.now() |> Timex.shift(minutes: -4))
      notifs = insert_list(3, :notification, updated_at: Timex.now())

      {:ok, %{data: %{"notifications" => found}}} = run_query("""
        query {
          notifications(all: true, first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([read | notifs])
    end
  end

  describe "accessToken" do
    test "it can fetch an access token for a user" do
      token = insert(:access_token)
      audit = insert(:access_token_audit, token: token)
      expect(Console.Features, :available?, fn :audit -> true end)

      {:ok, %{data: %{"accessToken" => found}}} = run_query("""
        query Token($id: ID!) {
          accessToken(id: $id) {
            id
            audits(first: 5) { edges { node { id } } }
          }
        }
      """, %{"id" => token.id}, %{current_user: token.user})

      assert found["id"] == token.id
      assert from_connection(found["audits"])
             |> ids_equal([audit])
    end

    test "it cannot fetch other users tokens" do
      token = insert(:access_token)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Token($id: ID!) {
          accessToken(id: $id) { id }
        }
      """, %{"id" => token.id}, %{current_user: insert(:user)})
    end
  end

  describe "accessTokens" do
    test "it can fetch the access tokens for a user" do
      user = insert(:user)
      tokens = insert_list(3, :access_token, user: user)

      {:ok, %{data: %{"accessTokens" => found}}} = run_query("""
        query {
          accessTokens(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal(tokens)
    end
  end
end
