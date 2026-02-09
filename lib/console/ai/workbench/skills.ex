defmodule Console.AI.Workbench.Skills do
  alias Console.Schema.{Workbench, GitRepository}
  alias Console.Deployments.Git

  def skills(%Workbench{repository: %GitRepository{} = repository, skills: %Workbench.Skills{ref: ref, files: [_ | _] = files}}) do
    with {:ok, contents} <- Git.fetch(repository, ref) do
      Enum.filter(contents, fn {k, _} -> k in files end)
      |> Enum.reduce_while([], fn {file, skill}, acc ->
        case parse_skill(file, skill) do
          {:ok, skill} -> {:cont, [skill | acc]}
          {:error, _} = err -> {:halt, err}
        end
      end)
      |> case do
        skills when is_list(skills) -> {:ok, skills}
        {:error, _} = err -> err
      end
    end
  end
  def skills(_), do: {:ok, []}

  @regex ~r/---(.*)---(.*)/s

  def parse_skill(file, skill) when is_binary(skill) do
    with {:regex, [_, meta, contents]} <- {:regex, Regex.run(@regex, skill)},
         {:yaml, {:ok, %{"name" => name, "description" => description}}} <- {:yaml, YamlElixir.read_from_string(meta)} do
      {:ok, %{
        name: String.trim(name),
        description: String.trim(description),
        contents: String.trim(contents)
      }}
    else
      {:regex, _} ->
        {:error, "could not parse skill in file #{file}, no metadata block found"}
      {:yaml, {:error, _} = err} ->
        {:error, "could not parse skill in file #{file}, invalid yaml block: #{inspect(err)}"}
      {:yaml, _} -> {:error, "could not parse skill in file #{file}, invalid yaml block"}
    end
  end
end
