defmodule ConsoleWeb.GraphQl.WorkbenchSubscriptionTest do
  use ConsoleWeb.ChannelCase, async: false

  alias Console.AI.Tools.KubeShellCollector

  describe "workbenchExecStream" do
    test "broadcasts exec output to users with read access to the activity workbench" do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      job = insert(:workbench_job, workbench: workbench)
      activity = insert(:workbench_job_activity, workbench_job: job, type: :exec)
      activity_id = activity.id
      {:ok, socket} = establish_socket(user)

      ref = push_doc(socket, subscription(), variables: %{"activityId" => activity.id})
      assert_reply(ref, :ok, %{subscriptionId: _})

      {:ok, collector} = KubeShellCollector.start(callback_pid: self(), activity: activity)
      send(collector, {:stdo, "stdout"})

      assert_push("subscription:data", %{
        result: %{
          data: %{
            "workbenchExecStream" => %{
              "activityId" => ^activity_id,
              "text" => "stdout",
              "seq" => 0
            }
          }
        }
      })

      Process.exit(collector, :shutdown)
    end

    test "does not broadcast when the collector has no activity" do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      job = insert(:workbench_job, workbench: workbench)
      activity = insert(:workbench_job_activity, workbench_job: job, type: :exec)
      {:ok, socket} = establish_socket(user)

      ref = push_doc(socket, subscription(), variables: %{"activityId" => activity.id})
      assert_reply(ref, :ok, %{subscriptionId: _})

      {:ok, collector} = KubeShellCollector.start(callback_pid: self())
      send(collector, {:stdo, "stdout"})

      refute_push("subscription:data", _)

      Process.exit(collector, :shutdown)
    end

    test "rejects users without read access to the activity workbench" do
      activity = insert(:workbench_job_activity, type: :exec)
      {:ok, socket} = establish_socket(insert(:user))

      ref = push_doc(socket, subscription(), variables: %{"activityId" => activity.id})

      assert_reply(ref, :error, %{errors: [%{message: "forbidden"}]})
    end
  end

  defp subscription do
    """
    subscription WorkbenchExecStream($activityId: ID!) {
      workbenchExecStream(activityId: $activityId) {
        activityId
        text
        seq
      }
    }
    """
  end
end
