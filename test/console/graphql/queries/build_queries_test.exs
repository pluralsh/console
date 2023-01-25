defmodule Console.GraphQl.BuildQueriesTest do
  use Console.DataCase, async: true

  describe "builds" do
    test "It can list builds" do
      builds = insert_list(3, :build)

      {:ok, %{data: %{"builds" => found}}} = run_query("""
        query {
          builds(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal(builds)
    end
  end

  describe "info" do
    test "it can aggregate all builds after your read timestamp" do
      old = Timex.now() |> Timex.shift(hours: -1)
      user = insert(:user, build_timestamp: old)
      insert_list(2, :build, status: :failed)
      insert_list(3, :build, status: :successful)
      insert(:build, status: :queued)
      insert_list(5, :build, status: :running)
      insert(:build, inserted_at: Timex.shift(old, hours: -1))

      {:ok, %{data: %{"buildInfo" => info}}} = run_query("""
        query {
          buildInfo { all running queued successful failed }
        }
      """, %{}, %{current_user: user})

      assert info["all"] == 11
      assert info["running"] == 5
      assert info["queued"] == 1
      assert info["successful"] == 3
      assert info["failed"] == 2
    end
  end

  describe "build" do
    test "It can sideload commands for a build" do
      build      = insert(:build)
      changelogs = insert_list(3, :changelog, build: build)
      user = insert(:user)
      setup_rbac(user, [build.repository], configure: true)
      commands   = for i <- 1..3,
        do: insert(:command, build: build, inserted_at: Timex.now() |> Timex.shift(days: -i))
      expected = commands |> Enum.map(& &1.id) |> Enum.reverse()

      {:ok, %{data: %{"build" => found}}} = run_query("""
        query Build($id: ID!) {
          build(id: $id) {
            id
            creator { id }
            changelogs { id }
            commands(first: 10) {
              edges { node { id stdout } }
            }
          }
        }
      """, %{"id" => build.id}, %{current_user: user})

      assert found["id"] == build.id
      assert found["creator"]["id"] == build.creator_id
      assert ids_equal(found["changelogs"], changelogs)
      assert from_connection(found["commands"]) |> Enum.map(& &1["id"]) == expected
    end

    test "users w/o perms cannot sideload changelogs" do
      user = insert(:user)
      build = insert(:build)
      setup_rbac(user, ["other"], configure: true)
      insert_list(3, :changelog, build: build)
      commands   = for i <- 1..3,
        do: insert(:command, build: build, inserted_at: Timex.now() |> Timex.shift(days: -i))
      expected = commands |> Enum.map(& &1.id) |> Enum.reverse()

      {:ok, %{data: %{"build" => found}, errors: [_ | _]}} = run_query("""
        query Build($id: ID!) {
          build(id: $id) {
            id
            creator { id }
            changelogs { id }
            commands(first: 10) {
              edges { node { id } }
            }
          }
        }
      """, %{"id" => build.id}, %{current_user: user})

      assert found["id"] == build.id
      assert found["creator"]["id"] == build.creator_id
      refute found["changelogs"]
      assert from_connection(found["commands"]) |> Enum.map(& &1["id"]) == expected
    end
  end
end
