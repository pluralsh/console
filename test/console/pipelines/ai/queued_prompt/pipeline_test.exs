defmodule Console.Pipelines.AI.QueuedPrompt.PipelineTest do
  use Console.DataCase, async: true
  alias Console.PubSub
  alias Console.Pipelines.AI.QueuedPrompt.Pipeline
  alias Console.Schema.QueuedPrompt

  describe "dequeueable query" do
    test "returns one due unconsumed prompt per idle workbench job" do
      due = DateTime.utc_now() |> DateTime.add(-60, :second) |> DateTime.truncate(:second)
      future = DateTime.utc_now() |> DateTime.add(60, :second) |> DateTime.truncate(:second)
      user = insert(:user)
      successful = insert(:workbench_job, status: :successful)
      cancelled = insert(:workbench_job, status: :cancelled)
      failed = insert(:workbench_job, status: :failed)
      running = insert(:workbench_job, status: :running)
      first = insert(:queued_prompt,
        id: "00000000-0000-0000-0000-000000000100",
        workbench_job: successful,
        user: user,
        prompt: "first",
        dequeable_at: due
      )
      _second = insert(:queued_prompt,
        id: "00000000-0000-0000-0000-000000000101",
        workbench_job: successful,
        user: user,
        prompt: "second",
        dequeable_at: DateTime.add(due, 1, :second)
      )
      cancelled_prompt = insert(:queued_prompt,
        id: "00000000-0000-0000-0000-000000000200",
        workbench_job: cancelled,
        user: user,
        dequeable_at: due
      )
      failed_prompt = insert(:queued_prompt,
        id: "00000000-0000-0000-0000-000000000250",
        workbench_job: failed,
        user: user,
        dequeable_at: due
      )
      insert(:queued_prompt,
        id: "00000000-0000-0000-0000-000000000300",
        workbench_job: running,
        user: user,
        dequeable_at: due
      )
      insert(:queued_prompt,
        id: "00000000-0000-0000-0000-000000000301",
        workbench_job: successful,
        user: user,
        dequeable_at: future
      )
      insert(:queued_prompt,
        id: "00000000-0000-0000-0000-000000000302",
        workbench_job: cancelled,
        user: user,
        dequeable_at: due,
        consumed_at: due
      )

      found =
        QueuedPrompt.dequeueable()
        |> Console.Repo.all()

      assert length(found) == length(Enum.uniq_by(found, & &1.workbench_job_id))
      assert ids_equal(found, [first, cancelled_prompt, failed_prompt])
    end

    test "prioritizes the lowest prompt id for each workbench job" do
      due = DateTime.utc_now() |> DateTime.add(-60, :second) |> DateTime.truncate(:second)
      user = insert(:user)
      job = insert(:workbench_job, status: :successful)
      lower_id = insert(:queued_prompt,
        id: "00000000-0000-0000-0000-000000000001",
        workbench_job: job,
        user: user,
        prompt: "lower id",
        dequeable_at: DateTime.add(due, 30, :second)
      )
      insert(:queued_prompt,
        id: "00000000-0000-0000-0000-000000000002",
        workbench_job: job,
        user: user,
        prompt: "earlier dequeable",
        dequeable_at: due
      )

      assert [found] = Console.Repo.all(QueuedPrompt.dequeueable())
      assert found.id == lower_id.id
      assert found.prompt == "lower id"
    end
  end

  describe "handle_event/1" do
    test "consumes the prompt and creates a workbench message" do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      job = insert(:workbench_job, workbench: workbench, status: :successful)
      prompt = insert(:queued_prompt, prompt: "pipeline follow-up", workbench_job: job, user: user)

      {:ok, activity} = Pipeline.handle_event(prompt)

      assert activity.workbench_job_id == job.id
      assert activity.prompt == "pipeline follow-up"
      assert activity.type == :user
      assert activity.user_id == user.id
      assert Console.Repo.get!(QueuedPrompt, prompt.id).consumed_at
      assert_receive {:event, %PubSub.WorkbenchJobActivityCreated{item: ^activity}}
    end
  end
end
