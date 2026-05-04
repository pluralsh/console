defmodule Console.Pipelines.AI.WorkbenchCron.PipelineTest do
  use Console.DataCase, async: true
  alias Console.PubSub
  alias Console.Pipelines.AI.WorkbenchCron.Pipeline

  describe "handle_event/1" do
    test "creates a workbench job and updates cron last_run_at and next_run_at" do
      insert(:user, bot_name: "console", roles: %{admin: true})
      group = insert(:group)
      %{user: user} = insert(:group_member, group: group)
      workbench = insert(:workbench, read_bindings: [%{group_id: group.id}])
      prompt = "scheduled analysis"
      past = DateTime.add(DateTime.utc_now(), -60, :second)
      cron = insert(:workbench_cron,
        workbench: workbench,
        prompt: prompt,
        user: user,
        crontab: "*/5 * * * *",
        next_run_at: past,
        last_run_at: nil
      )

      {:ok, job} = Pipeline.handle_event(cron)

      assert job.prompt == prompt
      assert job.workbench_id == workbench.id
      assert job.user_id == user.id
      assert job.status == :pending
      assert_receive {:event, %PubSub.WorkbenchJobCreated{item: ^job}}

      updated = refetch(cron)
      assert updated.last_run_at
      assert DateTime.compare(updated.last_run_at, past) != :lt
      assert updated.next_run_at
      assert DateTime.compare(updated.next_run_at, updated.last_run_at) in [:gt, :eq]
    end
  end
end
