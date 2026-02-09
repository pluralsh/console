defmodule Console.AI.Workbench.SkillsTest do
  use ExUnit.Case, async: true

  alias Console.AI.Workbench.Skills

  describe "parse_skill/2" do
    test "returns ok with parsed name, description, and contents when skill has valid format" do
      skill = "---\nname: MySkill\ndescription: Guides users through X\n---\nContent here."
      assert {:ok, parsed} = Skills.parse_skill("SKILL.md", skill)

      assert parsed.name == "MySkill"
      assert parsed.description == "Guides users through X"
      assert parsed.contents == "Content here."
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
end
