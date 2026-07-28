defmodule ConsoleWeb.OpenAPI.AI.QueuedPromptControllerTest do
  use ConsoleWeb.ConnCase, async: true

  describe "#create/2" do
    test "creates a queued prompt for a workbench job", %{conn: conn} do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      job = insert(:workbench_job, workbench: workbench, user: user)
      dequeable_at = DateTime.utc_now() |> DateTime.add(60, :second) |> DateTime.truncate(:second)

      result =
        conn
        |> add_auth_headers(user)
        |> json_post("/v1/api/ai/workbenches/jobs/#{job.id}/prompts", %{
          prompt: "from rest later",
          dequeable_at: DateTime.to_iso8601(dequeable_at)
        })
        |> json_response(200)

      assert result["id"]
      assert result["prompt"] == "from rest later"
      assert result["workbench_job_id"] == job.id
      assert result["user_id"] == user.id
      refute result["consumed_at"]
    end

    test "users without access cannot create queued prompts", %{conn: conn} do
      user = insert(:user)
      job = insert(:workbench_job)

      conn
      |> add_auth_headers(user)
      |> json_post("/v1/api/ai/workbenches/jobs/#{job.id}/prompts", %{
        prompt: "nope",
        dequeable_at: DateTime.utc_now() |> DateTime.add(60, :second) |> DateTime.to_iso8601()
      })
      |> json_response(403)
    end
  end

  describe "#delete/2" do
    test "deletes a queued prompt", %{conn: conn} do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      job = insert(:workbench_job, workbench: workbench)
      prompt = insert(:queued_prompt, workbench_job: job, user: user)

      result =
        conn
        |> add_auth_headers(user)
        |> delete("/v1/api/ai/workbenches/prompts/#{prompt.id}")
        |> json_response(200)

      assert result["id"] == prompt.id
      refute refetch(prompt)
    end
  end
end
