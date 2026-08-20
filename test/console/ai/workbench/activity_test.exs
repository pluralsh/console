defmodule Console.AI.Workbench.ActivityTest do
  use Console.DataCase, async: true

  alias Console.AI.Workbench.Activity
  alias Console.Repo
  alias Console.Schema.WorkbenchJobActivity
  import Ecto.Query

  describe "await_activity/2" do
    test "returns immediately when the activity is already complete" do
      activity = insert(:workbench_job_activity, status: :successful)

      assert {:ok, completed} = Activity.await_activity(activity, :timer.seconds(1))
      assert completed.id == activity.id
      assert completed.status == :successful
    end

    test "refetches an activity from the database between polling intervals" do
      activity = insert(:workbench_job_activity, status: :pending)

      task =
        Task.async(fn ->
          receive do
            :complete ->
              from(activity in WorkbenchJobActivity, where: activity.id == ^activity.id)
              |> Repo.update_all(set: [status: :successful])
          end
        end)

      Ecto.Adapters.SQL.Sandbox.allow(Repo, self(), task.pid)
      send(task.pid, :complete)

      assert {:ok, %{status: :successful}} = Activity.await_activity(activity, 50)
      assert {1, _} = Task.await(task)
    end
  end
end
