defmodule Console.Services.Changelogs do
  use Console.Services.Base
  alias Console.{Repo, Schema.Changelog}

  def add_changelogs(transaction) do
    diff_folder = Console.workspace() |>  Path.join("diffs")
    with {:ok, [_ | _] = subfolders} <- File.ls(diff_folder) do
      subfolders
      |> Enum.map(& {&1, Path.join(diff_folder, &1) |> File.ls()})
      |> Enum.flat_map(fn
        {repo, {:ok, contents}} -> Enum.map(contents, & {repo, &1})
        _ -> []
      end)
      |> Enum.reduce(transaction, fn {repo, diff_file}, transaction ->
        add_operation(transaction, diff_file, fn %{build: %{id: id}} ->
          add_changelog(repo, Path.join([diff_folder, repo, diff_file]), id)
        end)
      end)
    else
      _ -> transaction
    end
  end

  def add_changelog(repo, diff, build_id) do
    %Changelog{build_id: build_id}
    |> Changelog.changeset(%{
      repo: repo,
      tool: Path.basename(diff),
      content: File.read!(diff)
    })
    |> Repo.insert(on_conflict: :replace_all, conflict_target: [:build_id, :repo, :tool])
  end
end
