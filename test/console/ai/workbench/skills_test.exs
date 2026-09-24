defmodule Console.AI.Workbench.SkillsTest do
  use ExUnit.Case, async: true
  use Mimic

  alias Console.AI.Workbench.{Skill, Skills}
  alias Console.Deployments.Git
  alias Console.Schema.{GitRepository, Service, Workbench, WorkbenchSkill}

  @skill """
  ---
  name: auto
  description: detected from SKILL.md
  ---
  body
  """

  @example """
  ---
  name: cluster-gitops-workflow
  description: Use when you need guidance on the GitOps-based cluster management workflow — covers the hub-and-spoke ArgoCD deployment model, associated git projects, pipeline stages, and known caveats. WIP — workflow is not yet complete. Do NOT use for any unrelated legacy workflow; use /legacy-cluster-workflow for that.
  allowed-tools: "Bash, Read, Glob, Grep"
  metadata:
    author: ai-dev
    version: "1.0.0"
    category: infrastructure
    tags: [cluster, openshift, gitops, argocd, hub-spoke]
  ---

  You are an expert on your organization's **modern GitOps-based cluster management workflow**. This workflow leverages a hub-and-spoke cluster architecture with ArgoCD for continuous deployment. **This workflow is still a work in progress (WIP).**

  Use the knowledge base below to answer the user's question. Be specific, accurate, and practical. Flag anything that is still WIP or not yet fully tested. If the user asks about a legacy workflow, instruct them to use `/legacy-cluster-workflow` instead.

  ---

  ## KNOWLEDGE BASE: Cluster GitOps Workflow (WIP)

  ### Architecture Overview

  This workflow uses a **hub-and-spoke** model:

  - **Hub cluster** — Central management cluster running ArgoCD and a Multicluster Engine. Manages all spoke clusters. Multiple hubs may exist for geographic or environment distribution, such as `west-hub1`, `east-hub1`, and `preprod-hub` (lab).
  - **Spoke cluster** — Tenant-specific cluster, created via agent-based installation and managed continuously by the hub using ArgoCD.

  ArgoCD on the hub monitors a `siteconfigs` Git repo. When a new cluster config is pushed, ArgoCD syncs it to the hub, which provisions the spoke cluster. **Any manual changes to a spoke cluster are reverted by ArgoCD during the next sync.**

  ### Git Projects

  | Instance | URL |
  |---|---|
  | Lab | `https://gitlab.example.org/cluster-gitops` |
  | Production | `https://git.example.org/cluster-gitops` |
  """

  describe "skills/1" do
    test "loads SKILL.md files when the explicit file list is missing" do
      {wb, repo, ref} = git_workbench(nil)

      expect(Git, :fetch, fn ^repo, ^ref ->
        {:ok, [
          {"notes.md", "ignore me"},
          {"SKILL.md", @skill},
          {"cluster/SKILL.md", @skill}
        ]}
      end)

      assert {:ok, [%Skill{name: "auto"}]} = Skills.skills(wb)
    end

    test "loads SKILL.md files when the explicit file list is empty" do
      {wb, repo, ref} = git_workbench([])

      expect(Git, :fetch, fn ^repo, ^ref ->
        {:ok, [{"notes.md", "ignore me"}, {"cluster/SKILL.md", @skill}]}
      end)

      assert {:ok, [%Skill{name: "auto"}]} = Skills.skills(wb)
    end
  end

  describe "skill_file/2" do
    test "resolves an auto-detected SKILL.md when the explicit file list is missing" do
      {wb, repo, ref} = git_workbench(nil)

      expect(Git, :fetch, fn ^repo, ^ref ->
        {:ok, [{"cluster/SKILL.md", @skill}]}
      end)

      assert {:ok, {^repo, "main", "skills/cluster/SKILL.md"}} = Skills.skill_file("auto", wb)
    end
  end

  describe "skills_changeset/2" do
    test "accepts a git ref without a file list" do
      changeset = Workbench.skills_changeset(%Workbench.Skills{}, %{ref: %{ref: "main", folder: "skills"}})

      assert changeset.valid?
      assert Ecto.Changeset.get_change(changeset, :files) == nil
    end

    test "accepts an empty file list" do
      changeset = Workbench.skills_changeset(%Workbench.Skills{}, %{ref: %{ref: "main", folder: "skills"}, files: []})

      assert changeset.valid?
      assert Ecto.Changeset.get_change(changeset, :files) == []
    end
  end

  describe "plural?/2" do
    test "returns false when db-backed skills list is empty" do
      wb = struct(Workbench, %{workbench_skills: []})
      refute Skills.plural?("any-skill-name", wb)
    end

    test "returns false when job has no loaded workbench" do
      refute Skills.plural?("any-skill-name", nil)
    end

    test "returns true when a db skill matches the given name" do
      ws = struct(WorkbenchSkill, %{name: "my-skill", id: Ecto.UUID.generate()})
      wb = struct(Workbench, %{workbench_skills: [ws]})
      assert Skills.plural?("my-skill", wb)
      refute Skills.plural?("other-skill", wb)
    end
  end

  describe "parse_skill/2" do
    test "returns ok with parsed name, description, and contents when skill has valid format" do
      skill = "---\nname: MySkill\ndescription: Guides users through X\n---\nContent here."
      assert {:ok, parsed} = Skills.parse_skill("SKILL.md", skill)

      assert parsed.name == "MySkill"
      assert parsed.description == "Guides users through X"
      assert parsed.contents == "Content here."
    end

    test "returns ok with a more complex skill" do
      assert {:ok, parsed} = Skills.parse_skill("SKILL.md", @example)

      assert parsed.name == "cluster-gitops-workflow"
      assert parsed.description == "Use when you need guidance on the GitOps-based cluster management workflow — covers the hub-and-spoke ArgoCD deployment model, associated git projects, pipeline stages, and known caveats. WIP — workflow is not yet complete. Do NOT use for any unrelated legacy workflow; use /legacy-cluster-workflow for that."
      assert parsed.contents =~ "## KNOWLEDGE BASE: Cluster GitOps Workflow (WIP)"
      assert parsed.contents =~ "|---|---|"
      refute parsed.contents =~ "name: cluster-gitops-workflow"
    end

    test "trims name, description, and contents" do
      skill = "---\nname:  TrimmedName\ndescription:  A description\n---  \n  Body with spaces  "
      assert {:ok, parsed} = Skills.parse_skill("SKILL.md", skill)

      assert parsed.name == "TrimmedName"
      assert parsed.description == "A description"
      assert parsed.contents == "Body with spaces"
    end

    test "parses skill with multiline contents and preserves line breaks" do
      skill = "---\nname: Multi\ndescription: Has body\n---\nLine one.\nLine two.\n"

      assert {:ok, parsed} = Skills.parse_skill("foo.ex", skill)

      assert parsed.name == "Multi"
      assert parsed.description == "Has body"
      assert parsed.contents =~ "Line one"
      assert parsed.contents =~ "Line two"
      assert parsed.contents =~ "\n", "contents should include line breaks"
      assert parsed.contents == "Line one.\nLine two."
    end

    test "returns error when skill does not start with ---" do
      skill = "name:Bad description:No front matter---content"
      assert {:error, msg} = Skills.parse_skill("SKILL.md", skill)
      assert msg =~ "could not parse skill"
      assert msg =~ "SKILL.md"
      assert msg =~ "no metadata block"
    end

    test "returns error when name is missing from yaml block" do
      skill = "---\ndescription:Only description\n---\ncontent"
      assert {:error, msg} = Skills.parse_skill("x.md", skill)
      assert msg =~ "could not parse skill"
      assert msg =~ "x.md"
      assert msg =~ "invalid yaml"
    end

    test "returns error when description is missing from yaml block" do
      skill = "---\nname:OnlyName\n---\ncontent"
      assert {:error, msg} = Skills.parse_skill("a.md", skill)
      assert msg =~ "could not parse skill"
      assert msg =~ "a.md"
      assert msg =~ "invalid yaml"
    end

    test "returns error when second --- is missing" do
      skill = "---\nname:Ok\ndescription:Ok\nno closing dashes"
      assert {:error, msg} = Skills.parse_skill("bad.md", skill)
      assert msg =~ "could not parse skill"
      assert msg =~ "bad.md"
      assert msg =~ "no metadata block"
    end

    test "returns error for empty string" do
      assert {:error, msg} = Skills.parse_skill("empty.md", "")
      assert msg =~ "could not parse skill"
      assert msg =~ "empty.md"
    end
  end

  defp git_workbench(files) do
    repo = struct(GitRepository, %{id: Ecto.UUID.generate(), url: "https://github.com/example/skills.git"})
    ref = struct(Service.Git, %{ref: "main", folder: "skills"})
    wb = struct(Workbench, %{
      repository: repo,
      skills: struct(Workbench.Skills, %{ref: ref, files: files}),
      workbench_skills: []
    })

    {wb, repo, ref}
  end
end
