defmodule Watchman.GraphQl.UserQueriesTest do
  use Watchman.DataCase, async: true

  describe "users" do
    test "It can list all watchman users" do
      users = insert_list(3, :user)

      {:ok, %{data: %{"users" => found}}} = run_query("""
        query {
          users(first: 5) {
            edges {
              node {
                id
              }
            }
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
            edges {
              node {
                id
              }
            }
          }
        }
      """, %{"q" => "search"}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([user])
    end
  end

  describe "invite" do
    test "It can fetch an invite by secure id" do
      invite = insert(:invite, secure_id: "secure")

      {:ok, %{data: %{"invite" => found}}} = run_query("""
        query Invite($id: String!) {
          invite(id: $id) {
            email
          }
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
            edges {
              node { id }
            }
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
            edges {
              node {
                id
              }
            }
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
            edges {
              node { id }
            }
          }
        }
      """, %{"id" => group.id}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal(members)
    end
  end
end