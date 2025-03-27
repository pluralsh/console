defmodule Mix.Tasks.Scmtest.GitlabTest do
  use Mix.Task
  require HTTPoison

  def run(_) do
    HTTPoison.start()

    # Replace these with your actual values
    project_id = "inkscape%2Finkscape" # URL-encoded project path
    merge_request_iid = "7038"

    # Use the API endpoint for merge request diffs (no token needed for public repos)
    url = "https://gitlab.com/api/v4/projects/#{project_id}/merge_requests/#{merge_request_iid}/diffs"

    # Get filenames and print them
    files = get_filenames(url)
    IO.puts("\nFiles modified in merge request ##{merge_request_iid}:")
    IO.puts("=================================================================")

    Enum.each(files, fn file ->
      IO.puts("\nFile: #{file.filename}")
      IO.puts("Status: #{file.status}")
      IO.puts("URL: #{file.url}")
      IO.puts("Repo: #{file.repo}")
      IO.puts("Title: #{file.title}")
      IO.puts("Base path: #{file.base}")
      IO.puts("Head path: #{file.head}")
      IO.puts("\nPatch:")
      IO.puts("-----------------------------------------------------------------")
      IO.puts(file.patch)
      IO.puts("-----------------------------------------------------------------")
      IO.puts("\nContents:")
      IO.puts("-----------------------------------------------------------------")
      IO.puts(file.contents)
      IO.puts("-----------------------------------------------------------------")
      IO.puts("\n=================================================================")
    end)
  end

  defp get_filenames(url) do
    case HTTPoison.get(url) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        # Parse the JSON response
        diffs = Jason.decode!(body)

        # Extract the list of changed files with their status and convert to File struct
        Enum.map(diffs, fn diff ->
          file_status = cond do
            diff["new_file"] -> "(added)"
            diff["deleted_file"] -> "(deleted)"
            diff["renamed_file"] -> "(renamed)"
            true -> "(modified)"
          end

          %{
            url: url,
            repo: get_repo_url(url),
            title: "MR #{get_mr_id(url)}",
            contents: get_file_content(diff),
            filename: diff["new_path"],
            sha: nil,  # GitLab doesn't provide individual file SHAs in the diff API
            patch: diff["diff"],
            base: diff["old_path"],
            head: diff["new_path"],
            status: file_status
          }
        end)

      {:ok, %HTTPoison.Response{status_code: code, body: body}} ->
        IO.puts("Error: Got status code #{code}")
        IO.puts(body)
        []

      {:error, error} ->
        IO.puts("Error: #{inspect(error)}")
        []
    end
  end

  defp get_repo_url(url) do
    url
    |> String.replace("/api/v4/projects/", "")
    |> String.replace("/merge_requests/", "/-/merge_requests/")
    |> String.replace("/diffs", ".git")
  end

  defp get_mr_id(url) do
    url
    |> String.split("/merge_requests/")
    |> List.last()
    |> String.split("/")
    |> List.first()
  end

  defp get_file_content(diff) do
    case diff["diff"] do
      nil -> nil
      content -> content
    end
  end
end
