defmodule Console.AI.Tools.Workbench.CodingAgentTest do
  use Console.DataCase, async: true

  alias Console.AI.Tool
  alias Console.AI.Tools.Workbench.CodingAgent
  alias Console.Schema.{AgentRun, Workbench, WorkbenchJob}

  describe "changeset/2" do
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

  describe "implement/1" do
    test "passes approval and branch through to the agent run" do
      user = insert(:user)
      runtime = insert(:agent_runtime, create_bindings: [%{user_id: user.id}])
      Tool.context(user: user, runtime: runtime)

      assert {:ok, %AgentRun{id: run_id, approval: true, branch: "release-1.2"}} =
               CodingAgent.implement(%CodingAgent{
                 mode: :write,
                 repository: "https://github.com/pluralsh/console.git",
                 prompt: "update the readme",
                 base_branch: "release-1.2",
                 approval: true
               })

      run = Repo.get!(AgentRun, run_id)
      assert run.approval == true
      assert run.branch == "release-1.2"
    end
  end
end
