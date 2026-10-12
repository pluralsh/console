defmodule Console.AI.Tools.Workbench.CodingAgentTest do
  use Console.DataCase, async: true

  alias Console.AI.Tool
  alias Console.AI.Tools.Workbench.CodingAgent
  alias Console.Schema.{AgentRun, Workbench, WorkbenchJob}

  describe "changeset/2" do
    test "only exposes review mode when enabled for the job" do
      disabled = %CodingAgent{job: %WorkbenchJob{}}
      assert get_in(CodingAgent.json_schema(disabled), ["properties", "mode", "enum"]) == ~w(analyze write)
      refute get_in(CodingAgent.json_schema(disabled), ["properties", "mode", "description"]) =~ "review"
      refute CodingAgent.description(disabled) =~ "review"

      enabled = %CodingAgent{
        job: %WorkbenchJob{
          modes: %WorkbenchJob.Modes{
            coding: %WorkbenchJob.Modes.Coding{review: true}
          }
        }
      }
      schema = CodingAgent.json_schema(enabled)
      assert get_in(schema, ["properties", "mode", "enum"]) == ~w(analyze write review)
      assert get_in(schema, ["properties", "mode", "description"]) =~ "Review mode is enabled"
      assert get_in(schema, ["properties", "base_branch", "description"]) =~ "head branch"
      assert get_in(schema, ["properties", "pr_url", "description"]) =~ "Required for review mode"
      assert CodingAgent.description(enabled) =~ "Review mode is enabled for this job"
      assert CodingAgent.description(enabled) =~ "mode=review"
    end

    test "only exposes and accepts attachments when the workbench filesystem is enabled" do
      Mimic.stub(Console.PseudoFS, :enabled?, fn -> false end)
      tool = %CodingAgent{workbench: %Workbench{}, job: %WorkbenchJob{}}
      refute get_in(CodingAgent.json_schema(tool), ["properties", "attachments"])
      refute get_in(CodingAgent.json_schema(nil), ["properties", "attachments"])

      attrs = %{
        "mode" => "write",
        "repository" => "https://github.com/pluralsh/console.git",
        "prompt" => "fix it",
        "attachments" => ["/workbench/error.png"]
      }

      {:error, cs} = tool |> CodingAgent.changeset(attrs) |> Ecto.Changeset.apply_action(:update)
      assert "file attachments require the workbench filesystem to be enabled" in errors_on(cs).attachments
      {:ok, _} = tool |> CodingAgent.changeset(Map.delete(attrs, "attachments")) |> Ecto.Changeset.apply_action(:update)

      Mimic.stub(Console.PseudoFS, :enabled?, fn -> true end)
      assert get_in(CodingAgent.json_schema(tool), ["properties", "attachments", "type"]) == "array"
      {:ok, %CodingAgent{attachments: ["/workbench/error.png"]}} =
        tool |> CodingAgent.changeset(attrs) |> Ecto.Changeset.apply_action(:update)
    end

    test "review mode must be enabled and requires a branch" do
      attrs = %{
        "mode" => "review",
        "repository" => "https://github.com/pluralsh/console.git",
        "prompt" => "review https://github.com/pluralsh/console/pull/1"
      }

      {:error, disabled} =
        %CodingAgent{workbench: %Workbench{}, job: %WorkbenchJob{}}
        |> CodingAgent.changeset(attrs)
        |> Ecto.Changeset.apply_action(:update)

      assert "review mode is not enabled for this workbench job" in errors_on(disabled).mode

      job = %WorkbenchJob{
        modes: %WorkbenchJob.Modes{
          coding: %WorkbenchJob.Modes.Coding{review: true}
        }
      }

      {:error, missing_branch} =
        %CodingAgent{workbench: %Workbench{}, job: job}
        |> CodingAgent.changeset(attrs)
        |> Ecto.Changeset.apply_action(:update)

      assert "can't be blank" in errors_on(missing_branch).base_branch
      assert "can't be blank" in errors_on(missing_branch).pr_url

      assert {:ok, %CodingAgent{mode: :review, base_branch: "agent/review", pr_url: pr_url}} =
               %CodingAgent{workbench: %Workbench{}, job: job}
               |> CodingAgent.changeset(
                 attrs
                 |> Map.put("base_branch", "agent/review")
                 |> Map.put("pr_url", "https://github.com/pluralsh/console/pull/1")
               )
               |> Ecto.Changeset.apply_action(:update)

      assert pr_url == "https://github.com/pluralsh/console/pull/1"
    end

    test "review mode rejects followup runs" do
      job = %WorkbenchJob{
        modes: %WorkbenchJob.Modes{
          coding: %WorkbenchJob.Modes.Coding{review: true}
        }
      }

      {:error, changeset} =
        %CodingAgent{workbench: %Workbench{}, job: job}
        |> CodingAgent.changeset(%{
          "mode" => "review",
          "repository" => "https://github.com/pluralsh/console.git",
          "prompt" => "review the pull request",
          "followup" => true,
          "base_branch" => "agent/review",
          "head_branch" => "agent/follow-up",
          "pr_url" => "https://github.com/pluralsh/console/pull/1"
        })
        |> Ecto.Changeset.apply_action(:update)

      assert "cannot be enabled in review mode" in errors_on(changeset).followup
    end

    test "job babysit mode forces babysitting on" do
      job = %WorkbenchJob{
        modes: %WorkbenchJob.Modes{
          coding: %WorkbenchJob.Modes.Coding{babysit: true}
        }
      }

      assert {:ok, %CodingAgent{babysit: true}} =
               %CodingAgent{workbench: %Workbench{}, job: job}
               |> CodingAgent.changeset(%{
                 "mode" => "write",
                 "repository" => "https://github.com/pluralsh/console.git",
                 "prompt" => "update the readme",
                 "babysit" => false
               })
               |> Ecto.Changeset.apply_action(:update)
    end

    test "job approval mode forces approval on" do
      job = %WorkbenchJob{
        modes: %WorkbenchJob.Modes{
          coding: %WorkbenchJob.Modes.Coding{approval: true}
        }
      }

      assert {:ok, %CodingAgent{approval: true}} =
               %CodingAgent{workbench: %Workbench{}, job: job}
               |> CodingAgent.changeset(%{
                 "mode" => "write",
                 "repository" => "https://github.com/pluralsh/console.git",
                 "prompt" => "update the readme",
                 "approval" => false
               })
               |> Ecto.Changeset.apply_action(:update)
    end

    test "followup requires a head branch and pr url" do
      {:error, changeset} =
        %CodingAgent{workbench: %Workbench{}, job: %WorkbenchJob{}}
        |> CodingAgent.changeset(%{
          "mode" => "write",
          "repository" => "https://github.com/pluralsh/console.git",
          "prompt" => "update the readme",
          "followup" => true
        })
        |> Ecto.Changeset.apply_action(:update)

      assert "can't be blank" in errors_on(changeset).head_branch
      assert "can't be blank" in errors_on(changeset).pr_url

      assert {:ok, %CodingAgent{followup: true, head_branch: "agent/follow-up", pr_url: url}} =
               %CodingAgent{workbench: %Workbench{}, job: %WorkbenchJob{}}
               |> CodingAgent.changeset(%{
                 "mode" => "write",
                 "repository" => "https://github.com/pluralsh/console.git",
                 "prompt" => "update the readme",
                 "followup" => true,
                 "head_branch" => "agent/follow-up",
                 "pr_url" => "https://github.com/pluralsh/console/pull/1"
               })
               |> Ecto.Changeset.apply_action(:update)

      assert url == "https://github.com/pluralsh/console/pull/1"
    end

    test "job plan mode requires analyze mode" do
      job = %WorkbenchJob{modes: %WorkbenchJob.Modes{plan: true}}

      {:error, changeset} =
        %CodingAgent{workbench: %Workbench{}, job: job}
        |> CodingAgent.changeset(%{
          "mode" => "write",
          "repository" => "https://github.com/pluralsh/console.git",
          "prompt" => "investigate the issue"
        })
        |> Ecto.Changeset.apply_action(:update)

      assert "write mode is not allowed for workbench jobs that specify planning mode" in errors_on(changeset).mode

      assert {:ok, %CodingAgent{mode: :analyze}} =
               %CodingAgent{workbench: %Workbench{}, job: job}
               |> CodingAgent.changeset(%{
                 "mode" => "analyze",
                 "repository" => "https://github.com/pluralsh/console.git",
                 "prompt" => "investigate the issue"
               })
               |> Ecto.Changeset.apply_action(:update)
    end
  end

  describe "coding subagent prompt" do
    test "explains review only when enabled" do
      path = Console.priv_filename(["prompts", "workbench", "coding.md.eex"])

      enabled = EEx.eval_file(path, assigns: [prompt: "review the pr", review: true, filesystem: false])
      assert enabled =~ "Review mode is enabled for this job"
      assert enabled =~ "mode=review"
      assert enabled =~ "head"

      disabled = EEx.eval_file(path, assigns: [prompt: "update the readme", review: false, filesystem: false])
      refute disabled =~ "Review mode is enabled"
      refute disabled =~ "mode=review"
    end

    test "only explains attachments when the workbench filesystem is enabled" do
      path = Console.priv_filename(["prompts", "workbench", "coding.md.eex"])

      assert EEx.eval_file(path, assigns: [prompt: "fix it", review: false, filesystem: true]) =~ "`attachments` param"
      refute EEx.eval_file(path, assigns: [prompt: "fix it", review: false, filesystem: false]) =~ "`attachments` param"
    end
  end

  describe "implement/1" do
    test "creates a review run on the requested branch" do
      user = insert(:user)
      runtime = insert(:agent_runtime, create_bindings: [%{user_id: user.id}])
      Tool.context(user: user, runtime: runtime)

      assert {:ok, %AgentRun{id: run_id, mode: :review, branch: "agent/review", followup_pr_url: pr_url}} =
               CodingAgent.implement(%CodingAgent{
                 mode: :review,
                 repository: "https://github.com/pluralsh/console.git",
                 prompt: "review https://github.com/pluralsh/console/pull/1",
                 base_branch: "agent/review",
                 pr_url: "https://github.com/pluralsh/console/pull/1",
                 approval: false
               })

      assert pr_url == "https://github.com/pluralsh/console/pull/1"
      assert %AgentRun{mode: :review, branch: "agent/review", followup_pr_url: ^pr_url} = Repo.get!(AgentRun, run_id)
    end

    test "links workbench files passed as attachments to the agent run" do
      user = insert(:user)
      runtime = insert(:agent_runtime, create_bindings: [%{user_id: user.id}])
      activity = insert(:workbench_job_activity)
      Tool.context(user: user, runtime: runtime)
      Mimic.expect(Console.PseudoFS, :enabled?, fn -> true end)
      Mimic.expect(Console.PseudoFS, :stat, fn _, "/_plrl_/uploads/1/error.png" ->
        {:ok, %Pseudofs.V1.StatResponse{kind: :FILE, size: 7}}
      end)

      {:ok, %AgentRun{} = run} =
        CodingAgent.implement(%CodingAgent{
          mode: :write,
          repository: "https://github.com/pluralsh/console.git",
          prompt: "fix the error in the screenshot",
          approval: false,
          activity: activity,
          attachments: ["/workbench/_plrl_/uploads/1/error.png"]
        })

      %{attachments: [attachment]} = Repo.preload(run, :attachments)
      assert attachment.path == "/_plrl_/uploads/1/error.png"
      assert attachment.filetype == "image/png"
    end

    test "passes approval, followup, head branch, and pr url through to the agent run" do
      user = insert(:user)
      runtime = insert(:agent_runtime, create_bindings: [%{user_id: user.id}])
      Tool.context(user: user, runtime: runtime)

      assert {:ok, %AgentRun{id: run_id, approval: true, followup: true, branch: nil, head_branch: "agent/follow-up", followup_pr_url: "https://github.com/pluralsh/console/pull/1"}} =
               CodingAgent.implement(%CodingAgent{
                 mode: :write,
                 repository: "https://github.com/pluralsh/console.git",
                 prompt: "update the readme",
                 approval: true,
                 followup: true,
                 head_branch: "agent/follow-up",
                 pr_url: "https://github.com/pluralsh/console/pull/1"
               })

      run = Repo.get!(AgentRun, run_id)
      assert run.approval == true
      assert run.followup == true
      assert run.branch == nil
      assert run.head_branch == "agent/follow-up"
      assert run.followup_pr_url == "https://github.com/pluralsh/console/pull/1"
    end

    test "creates an agent run when base_branch is nil" do
      user = insert(:user)
      runtime = insert(:agent_runtime, create_bindings: [%{user_id: user.id}])
      Tool.context(user: user, runtime: runtime)

      assert {:ok, %AgentRun{id: run_id, branch: nil}} =
               CodingAgent.implement(%CodingAgent{
                 mode: :write,
                 repository: "https://github.com/pluralsh/console.git",
                 prompt: "update the readme",
                 base_branch: nil,
                 approval: false
               })

      run = Repo.get!(AgentRun, run_id)
      assert run.branch == nil
      assert run.prompt == "update the readme"
      assert run.repository == "https://github.com/pluralsh/console.git"
    end

    test "persists skills passed in the name to skill map form" do
      user = insert(:user)
      runtime = insert(:agent_runtime, create_bindings: [%{user_id: user.id}])
      Tool.context(user: user, runtime: runtime)

      assert {:ok, %AgentRun{id: run_id}} =
               CodingAgent.implement(%CodingAgent{
                 mode: :write,
                 repository: "https://github.com/pluralsh/console.git",
                 prompt: "update the readme",
                 approval: false,
                 skills: %{
                   "readme-helper" => %{
                     name: "readme-helper",
                     description: "Helps update README files",
                     contents: "Always keep examples runnable.",
                     subagents: [:coding]
                   }
                 }
               })

      run = Repo.get!(AgentRun, run_id)
      assert [%{name: "readme-helper", description: "Helps update README files", contents: "Always keep examples runnable."}] = run.skills
    end
  end
end
