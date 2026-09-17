defmodule Console.AI.Tools.Workbench.SkillCreateTest do
  use Console.DataCase, async: true

  alias Console.AI.Tools.Workbench.SkillCreate

  test "rejects creation when the configured skill limit has been reached" do
    job = insert(:workbench_job)

    assert {:error, "workbench already has the configured maximum of 12 skills"} =
             SkillCreate.implement(%SkillCreate{
               job: job,
               name: "another-skill",
               contents: "contents",
               max_skills: 12,
               skill_count: 12
             })

    refute Repo.get_by(Console.Schema.WorkbenchSkill,
             workbench_id: job.workbench_id,
             name: "another-skill"
           )
  end
end
