defmodule Console.Deployments.AttachmentsTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PseudoFS
  alias Console.Deployments.{Agents, Attachments, Workbenches}
  alias Console.Schema.{Attachment, WorkbenchJobActivityAgentRun}
  alias ReqLLM.Message.ContentPart

  setup do
    path = Path.join(System.tmp_dir!(), "attachment-#{Ecto.UUID.generate()}.png")
    File.write!(path, "image-bytes")
    on_exit(fn -> File.rm(path) end)
    {:ok, upload: %Plug.Upload{path: path, filename: "screen shot.png", content_type: "image/png"}}
  end

  describe "create_workbench_job/3" do
    test "it uploads attachments into the workbench filesystem", %{upload: upload} do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      wid = workbench.id
      expect(PseudoFS, :enabled?, fn -> true end)
      expect(PseudoFS, :upload, fn ^wid, "/_plrl_/uploads/" <> _, local ->
        assert local == upload.path
        {:ok, 11}
      end)

      {:ok, job} = Workbenches.create_workbench_job(%{prompt: "look at this", attachments: [upload]}, workbench.id, user)

      [attachment] = Console.Repo.all(Attachment)
      assert attachment.workbench_id == workbench.id
      assert attachment.workbench_job_id == job.id
      refute attachment.workbench_job_activity_id
      assert attachment.filename == "screen shot.png"
      assert attachment.filetype == "image/png"
      assert attachment.size == 11
      assert attachment.path == "/_plrl_/uploads/#{attachment.id}/screen shot.png"

      %{attachments: [loaded]} = Console.Repo.preload(job, :attachments)
      assert loaded.id == attachment.id
    end

    test "it rolls back the job if the upload fails", %{upload: upload} do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      expect(PseudoFS, :enabled?, fn -> true end)
      expect(PseudoFS, :upload, fn _, _, _ -> {:error, %GRPC.RPCError{status: 8, message: "resource exhausted: too big"}} end)

      {:error, "failed to upload attachment: resource exhausted: too big"} =
        Workbenches.create_workbench_job(%{prompt: "look at this", attachments: [upload]}, workbench.id, user)

      refute Console.Repo.exists?(Console.Schema.WorkbenchJob)
      refute Console.Repo.exists?(Attachment)
    end

    test "it errors when no object store is configured", %{upload: upload} do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])

      {:error, "file attachments require an object store to be configured"} =
        Workbenches.create_workbench_job(%{prompt: "look at this", attachments: [upload]}, workbench.id, user)
    end
  end

  describe "create_message/3" do
    test "it attaches files to the new activity", %{upload: upload} do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      job = insert(:workbench_job, user: user, workbench: workbench, status: :successful)
      expect(PseudoFS, :enabled?, fn -> true end)
      expect(PseudoFS, :upload, fn _, _, _ -> {:ok, 11} end)

      {:ok, activity} = Workbenches.create_message(%{prompt: "and this", attachments: [upload]}, job.id, user)

      [attachment] = Console.Repo.all(Attachment)
      assert attachment.workbench_job_activity_id == activity.id
      assert attachment.workbench_job_id == job.id
      assert Console.Repo.preload(job, :attachments, force: true).attachments == []
    end
  end

  describe "queued prompts" do
    test "attachments move to the activity created on dequeue", %{upload: upload} do
      user = insert(:user)
      workbench = insert(:workbench, read_bindings: [%{user_id: user.id}])
      job = insert(:workbench_job, workbench: workbench, status: :successful)
      expect(PseudoFS, :enabled?, fn -> true end)
      expect(PseudoFS, :upload, fn _, _, _ -> {:ok, 11} end)

      {:ok, prompt} = Workbenches.create_queued_prompt(%{
        prompt: "later",
        dequeable_at: DateTime.utc_now(),
        attachments: [upload]
      }, job.id, user)

      [attachment] = Console.Repo.all(Attachment)
      assert attachment.queued_prompt_id == prompt.id
      refute attachment.workbench_job_id

      {:ok, activity} = Workbenches.dequeue_prompt(prompt)

      attachment = refetch(attachment)
      assert attachment.workbench_job_activity_id == activity.id
      assert attachment.workbench_job_id == job.id
    end
  end

  describe "Agents.create_prompt/4" do
    test "it attaches files to prompts for workbench agent runs", %{upload: upload} do
      user = insert(:user)
      run = insert(:agent_run, user: user)
      activity = insert(:workbench_job_activity)
      %WorkbenchJobActivityAgentRun{}
      |> WorkbenchJobActivityAgentRun.changeset(%{workbench_job_activity_id: activity.id, agent_run_id: run.id})
      |> Console.Repo.insert!()
      expect(PseudoFS, :enabled?, fn -> true end)
      expect(PseudoFS, :upload, fn _, _, _ -> {:ok, 11} end)

      {:ok, _} = Agents.create_prompt("with a file", run.id, user, [upload])

      [attachment] = Console.Repo.all(Attachment)
      assert attachment.agent_run_id == run.id
      assert attachment.agent_prompt_id
      assert attachment.workbench_id == activity.workbench_job.workbench_id
    end

    test "it rejects attachments for agent runs outside a workbench", %{upload: upload} do
      user = insert(:user)
      run = insert(:agent_run, user: user)

      {:error, "file attachments are only supported for agent runs spawned by a workbench"} =
        Agents.create_prompt("with a file", run.id, user, [upload])
    end
  end

  describe "prompt_content/2" do
    test "it inlines images and hints at all attachments" do
      image = build(:attachment, filename: "a.png", filetype: "image/png", size: 5, path: "/_plrl_/uploads/1/a.png")
      pdf = build(:attachment, filename: "b.pdf", filetype: "application/pdf", size: 2048, path: "/_plrl_/uploads/2/b.pdf")
      expect(PseudoFS, :read_bytes, fn _, "/_plrl_/uploads/1/a.png" -> {:ok, "bytes"} end)

      [%ContentPart{type: :text, text: text}, %ContentPart{type: :image, data: "bytes", media_type: "image/png"}] =
        Attachments.prompt_content("prompt", [image, pdf])

      assert text =~ "prompt"
      assert text =~ "`/workbench/_plrl_/uploads/1/a.png` (image/png, 5 B, included inline)"
      assert text =~ "`/workbench/_plrl_/uploads/2/b.pdf` (application/pdf, 2.0 KB)"
    end

    test "it leaves prompts without attachments alone" do
      assert Attachments.prompt_content("prompt", []) == "prompt"
    end
  end
end
