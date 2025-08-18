defmodule Console.Deployments.SentinelTest do
  use Console.DataCase, async: true
  alias Console.Deployments.Sentinels

  describe "create_sentinel/2" do
    test "project writers can create a sentinel" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])

      {:ok, sentinel} = Sentinels.create_sentinel(%{
        name: "test",
        checks: [%{type: :log, name: "test",configuration: %{log: %{namespace: "test", duration: "1h", query: "error"}}}],
        project_id: project.id,
      }, user)

      assert sentinel.project_id == project.id
      assert length(sentinel.checks) == 1
    end

    test "project readers cannot create a sentinel" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])

      {:error, _} = Sentinels.create_sentinel(%{
        name: "test",
        checks: [%{type: :log, name: "test", configuration: %{log: %{namespace: "test", duration: "1h", query: "error"}}}],
        project_id: project.id,
      }, user)
    end
  end

  describe "update_sentinel/3" do
    test "project writers can update a sentinel" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project)

      {:ok, sentinel} = Sentinels.update_sentinel(%{
        name: "test",
        checks: [%{type: :log, name: "test", configuration: %{log: %{namespace: "test", duration: "1h", query: "error"}}}],
        project_id: project.id,
      }, sentinel.id, user)

      assert sentinel.name == "test"
      assert length(sentinel.checks) == 1
      assert sentinel.project_id == project.id
    end

    test "project readers cannot update a sentinel" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project)

      {:error, _} = Sentinels.update_sentinel(%{
        name: "test",
        checks: [%{type: :log, name: "test",configuration: %{log: %{namespace: "test", duration: "1h", query: "error"}}}],
        project_id: project.id,
      }, sentinel.id, user)
    end
  end

  describe "delete_sentinel/2" do
    test "project writers can delete a sentinel" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project)

      {:ok, deleted} = Sentinels.delete_sentinel(sentinel.id, user)

      assert deleted.id == sentinel.id
      refute refetch(sentinel)
    end

    test "project readers cannot delete a sentinel" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project)

      {:error, _} = Sentinels.delete_sentinel(sentinel.id, user)

      assert refetch(sentinel)
    end
  end

  describe "run_sentinel/2" do
    test "project writers can run a sentinel" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project)

      {:ok, run} = Sentinels.run_sentinel(sentinel.id, user)

      assert run.sentinel_id == sentinel.id
      assert run.status == :pending
    end

    test "non project readers cannot run a sentinel" do
      user = insert(:user)
      project = insert(:project)
      sentinel = insert(:sentinel, project: project)

      {:error, _} = Sentinels.run_sentinel(sentinel.id, user)

      assert refetch(sentinel)
    end
  end
end
