defmodule Mix.Tasks.Scmtest.BitbucketTest do
  use Mix.Task
  require HTTPoison

  def run(_) do
    HTTPoison.start()

    # Using a real public PR from Atlaskit
    project_key = "atlassian"
    repo_slug = "atlaskit"
    pull_request_id = "4982"  # Real PR ID for testing

    # Use the API endpoint for pull request details
    url = "https://api.bitbucket.org/2.0/repositories/#{project_key}/#{repo_slug}/pullrequests/#{pull_request_id}"

    # Get files and print them
    files = get_files(url)
    IO.puts("\nFiles modified in pull request ##{pull_request_id}:")
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

  defp get_files(url) do
    with {:ok, pr} <- get_pr_details(url),
         {:ok, changes} <- get_pr_changes(url) do
      Enum.map(changes, fn change ->
        file_status = cond do
          change["status"] == "added" -> "(added)"
          change["status"] == "removed" -> "(deleted)"
          change["status"] == "renamed" -> "(renamed)"
          true -> "(modified)"
        end

        %{
          url: url,
          repo: get_repo_url(url),
          title: pr["title"],
          contents: get_file_content(change),
          filename: change["path"],
          sha: change["hash"],
          patch: change["patch"],
          base: change["old_path"],
          head: change["path"],
          status: file_status
        }
      end)
    else
      {:error, error} ->
        IO.puts("Error: #{inspect(error)}")
        []
    end
  end

  defp get_pr_details(url) do
    case HTTPoison.get(url, [], follow_redirect: true) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        {:ok, Jason.decode!(body)}

      {:ok, %HTTPoison.Response{status_code: code, body: body}} ->
        {:error, "Got status code #{code}: #{body}"}

      {:error, error} ->
        {:error, error}
    end
  end

  defp get_pr_changes(url) do
    # Use the diff endpoint instead of changes
    diff_url = "#{url}/diff"
    case HTTPoison.get(diff_url, [], follow_redirect: true) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        # Parse the diff to get file changes
        changes = parse_diff(body)
        {:ok, changes}

      {:ok, %HTTPoison.Response{status_code: code, body: body}} ->
        {:error, "Got status code #{code}: #{body}"}

      {:error, error} ->
        {:error, error}
    end
  end

  defp parse_diff(diff) do
    # Split the diff into files
    files = String.split(diff, "diff --git")
    |> Enum.drop(1)  # Drop the first empty split
    |> Enum.map(fn file_diff ->
      # Extract file paths and content
      [header | content] = String.split(file_diff, "\n", parts: 2)
      [old_path, new_path] = Regex.run(~r/a\/(.*?)\s+b\/(.*?)$/, header, capture: :all_but_first)

      %{
        "path" => new_path,
        "old_path" => old_path,
        "status" => "modified",  # We'll need to determine this from the diff content
        "patch" => content,
        "hash" => nil  # We don't have this in the diff
      }
    end)

    files
  end

  defp get_repo_url(url) do
    url
    |> String.replace("/api/2.0/repositories/", "")
    |> String.replace("/pullrequests/", "/pull-requests/")
    |> String.replace("/diff", ".git")
  end

  defp get_file_content(change) do
    case change["patch"] do
      nil -> nil
      content -> content
    end
  end
end
