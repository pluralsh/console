defmodule Console.AI.Tools.Workbench.SkillUpdateTest do
  use Console.DataCase, async: false
  use Mimic

  alias Console.AI.Tool
  alias Console.AI.Tools.Workbench.SkillUpdate
  alias Console.AI.Tools.Pr
  alias Console.AI.Workbench.Skills
  alias Console.Schema.PullRequest

  @valid_args %{
    "name" => "my-skill",
    "previous" => "old",
    "replacement" => "new",
    "branch_name" => "skill-update",
    "pr_title" => "update skill",
    "pr_description" => "skill pr body",
    "commit_message" => "update my-skill"
  }

  describe "changeset/2" do
    test "allows commit_message to be omitted for plural-backed updates" do
      assert {:ok, %SkillUpdate{commit_message: nil}} =
               Tool.validate(%SkillUpdate{}, %{
                 "name" => "my-skill",
                 "previous" => "old",
                 "replacement" => "new"
               })
    end

    test "casts commit_message when provided for git-backed updates" do
      assert {:ok, %SkillUpdate{commit_message: "update my-skill"}} =
               Tool.validate(%SkillUpdate{}, @valid_args)
    end
  end

  describe "implement/1" do
    test "git_update validates SkillUpdate then creates a pull request via Pr when the skill is git-backed" do
      user = insert(:user)
      repo = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      workbench = insert(:workbench, repository: repo)
      job = insert(:workbench_job, workbench: workbench, user: user)
      job = Repo.preload(job, workbench: [:repository, :workbench_skills])

      Console.AI.Tool.context(user: user, job: job)

      branch = "main"
      path = "skills/my-skill.md"

      expect(Skills, :skill_file, fn "my-skill", wb ->
        assert wb.id == workbench.id
        {:ok, {repo, branch, path}}
      end)

      pr_attrs = %{
        url: "https://github.com/pluralsh/console/pull/1",
        title: "update skill",
        body: "skill pr body"
      }

      expect(Pr, :implement, fn %Pr{} = tool ->
        assert tool.repo_url == repo.url
        assert tool.branch_name == branch
        assert tool.commit_message == "update my-skill"
        assert tool.pr_title == "update skill"
        assert tool.pr_description == "skill pr body"

        assert [%{file_name: ^path, previous: "old", replacement: "new"}] =
                 tool.file_updates

        {:ok, pr_attrs}
      end)

      impl = %SkillUpdate{job: job}

      assert {:ok, %SkillUpdate{} = parsed} = Tool.validate(impl, @valid_args)
      assert parsed.name == "my-skill"
      assert parsed.previous == "old"
      assert parsed.replacement == "new"
      assert parsed.branch_name == "skill-update"
      assert parsed.pr_title == "update skill"
      assert parsed.pr_description == "skill pr body"
      assert parsed.commit_message == "update my-skill"
      assert parsed.job.id == job.id

      assert {:ok, %SkillUpdate.Result{result: %PullRequest{} = pr}} =
               SkillUpdate.implement(parsed)

      assert pr.url == pr_attrs.url
      assert pr.title == pr_attrs.title
      assert pr.author_id == user.id
      assert pr.workbench_job_id == job.id
    end
  end
end
