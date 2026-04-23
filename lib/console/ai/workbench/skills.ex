defmodule Console.AI.Workbench.Skill do
  defstruct [:name, :description, :contents, subagents: []]

  def subagent?(%__MODULE__{subagents: [_ | _] = subagents}, subagent) do
    Enum.map(subagents, & String.downcase("#{&1}"))
    |> Enum.member?("#{subagent}")
  end
  def subagent?(_, _), do: true
end

defmodule Console.AI.Workbench.Skills.Builtins do
  alias Console.AI.Workbench.Skill
  @canvas File.read!(Console.priv_filename(["prompts", "workbench", "skills", "canvas.md"]))

  def builtins() do
    [
      %Skill{
        name: "canvas",
        description: "guidance on how to use the canvas tool to build a dashboard",
        contents: @canvas,
        subagents: [:canvas, :orchestrator]
      }
    ]
  end
end

defmodule Console.AI.Workbench.Skills do
  alias Console.Schema.{Workbench, GitRepository, WorkbenchSkill}
  alias Console.Deployments.Git
  alias Console.AI.Workbench.Skill

  @spec skills(Workbench.t) :: {:ok, [Skill.t]} | Console.error
  def skills(%Workbench{
    repository: %GitRepository{} = repository,
    skills: %Workbench.Skills{ref: ref, files: [_ | _] = files},
    workbench_skills: db_skills
  }) do
    with {:ok, contents} <- Git.fetch(repository, ref) do
      Enum.filter(contents, fn {k, _} -> k in files end)
      |> Enum.reduce_while([], fn {file, skill}, acc ->
        case parse_skill(file, skill) do
          {:ok, skill} -> {:cont, [skill | acc]}
          {:error, _} = err -> {:halt, err}
        end
      end)
      |> case do
        skills when is_list(skills) ->
          Enum.concat(skills, convert_db_skills(db_skills))
          |> then(&{:ok, &1})
        {:error, _} = err -> err
      end
    end
  end
  def skills(%Workbench{workbench_skills: db_skills}), do: {:ok, convert_db_skills(db_skills)}

  def plural?(name, %Workbench{workbench_skills: [_ | _] = db}) do
    Enum.any?(db, fn %WorkbenchSkill{name: n} -> n == name end)
  end
  def plural?(_), do: false

  def skill_file(name, %Workbench{repository: %GitRepository{} = r, skills: %Workbench.Skills{ref: ref, files: [_ | _] = files}}) do
    with {:ok, contents} <- Git.fetch(r, ref) do
      Enum.filter(contents, fn {k, _} -> k in files end)
      |> Enum.find(fn {file, skill} ->
        case parse_skill(file, skill) do
          {:ok, %Skill{name: ^name}} -> true
          _ -> false
        end
      end)
      |> case do
        {filename, _} -> {:ok, {r, ref.branch, Path.join([ref.folder, filename])}}
        _ -> {:error, "skill not found in git"}
      end
    end
  end
  def skill_file(_, _), do: {:error, "this workbench doesn't have git based skills configured"}

  defp convert_db_skills(db_skills) when is_list(db_skills) do
    Enum.map(db_skills, fn %WorkbenchSkill{name: name, description: description, contents: contents} ->
      %Skill{name: name, description: description, contents: contents}
    end)
  end
  defp convert_db_skills(_), do: []

  @regex ~r/---(.*)---(.*)/s

  def parse_skill(file, skill) when is_binary(skill) do
    with {:regex, [_, meta, contents]} <- {:regex, Regex.run(@regex, skill)},
         {:yaml, {:ok, %{"name" => name, "description" => description} = meta}} <- {:yaml, YamlElixir.read_from_string(meta)} do
      {:ok, %Skill{
        name: String.trim(name),
        description: String.trim(description),
        contents: String.trim(contents),
        subagents: parse_subagents(meta["subagents"])
      }}
    else
      {:regex, _} ->
        {:error, "could not parse skill in file #{file}, no metadata block found"}
      {:yaml, {:error, _} = err} ->
        {:error, "could not parse skill in file #{file}, invalid yaml block: #{inspect(err)}"}
      {:yaml, _} -> {:error, "could not parse skill in file #{file}, invalid yaml block"}
    end
  end

  defp parse_subagents(subagents) when is_list(subagents), do: subagents
  defp parse_subagents(subagents) when is_binary(subagents) do
    String.split(subagents, ",")
    |> Enum.map(&String.trim/1)
    |> Enum.map(&String.downcase/1)
  end
  defp parse_subagents(_), do: []
end
