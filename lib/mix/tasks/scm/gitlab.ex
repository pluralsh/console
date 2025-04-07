defmodule Mix.Tasks.Scm.Gitlab do
  use Mix.Task

  @gitlab_api_url "https://gitlab.com/api/v4"

  def run(_args) do
    url = "https://gitlab.com/inkscape/inkscape/-/merge_requests/6978"
    HTTPoison.start()

    case get_mr_info(url) do
      {:ok, mr_info} ->
        # Print raw URLs for each changed file
        mr_info["changes"]
        |> Enum.map(fn change ->
          raw_url = get_raw_url(url, change)
          file_contents = get_file_contents(raw_url)

          # Create a map similar to GitHub's File struct
          file_map = %{
            url: url,                              # MR URL
            repo: get_repo_url(url),              # Repository URL
            title: mr_info["title"],              # MR title
            contents: file_contents,               # File contents
            filename: change["new_path"],          # File path
            sha: change["sha"],                    # Commit SHA
            patch: change["diff"],                 # The diff/patch
            base: mr_info["target_branch"],        # Target branch
            head: mr_info["source_branch"]         # Source branch
          }

          # Print the file map in a readable format
          IO.puts("\nFile Properties:")
          file_map
          |> Enum.each(fn {key, value} ->
            # Truncate long values for better readability
            display_value = case value do
              nil -> "nil"
              str when is_binary(str) and byte_size(str) > 100 ->
                String.slice(str, 0..100) <> "..."
              other -> inspect(other)
            end
            IO.puts("#{key}: #{display_value}")
          end)

          # You can still write to file if needed
          tmp_path = Path.join([System.user_home!(), "tmp", String.replace(change["new_path"], "/", "_")])
          File.mkdir_p!(Path.dirname(tmp_path))
          File.write!(tmp_path, file_contents)
        end)

        File.write!("gitlab_mr_info.txt", Jason.encode!(mr_info, pretty: true))
        IO.puts("\nFull MR info written to gitlab_mr_info.txt")
      {:error, reason} ->
        IO.puts("Error: #{reason}")
    end
  end

  def get_mr_info(url) do
    with {:ok, project_id, mr_iid} <- parse_gitlab_url(url),
         encoded_project_id = URI.encode_www_form(project_id),
         # First get the MR details to get the SHA
         api_url = "#{@gitlab_api_url}/projects/#{encoded_project_id}/merge_requests/#{mr_iid}",
         {:ok, response} <- HTTPoison.get(api_url, [{"Content-Type", "application/json"}]),
         {:ok, mr_details} <- Jason.decode(response.body),
         # Then get the diffs
         diffs_url = "#{@gitlab_api_url}/projects/#{encoded_project_id}/merge_requests/#{mr_iid}/changes",
         {:ok, diffs_response} <- HTTPoison.get(diffs_url, [{"Content-Type", "application/json"}]),
         {:ok, body} <- Jason.decode(diffs_response.body) do

      # Add the SHA to each change in the response
      changes = body["changes"] || []
      changes_with_sha = Enum.map(changes, fn change -> Map.put(change, "sha", mr_details["sha"]) end)
      body = Map.put(body, "changes", changes_with_sha)

      case diffs_response.status_code do
        200 -> {:ok, body}
        404 -> {:error, "Merge request not found"}
        _ -> {:error, "Failed to fetch merge request info (status #{diffs_response.status_code})"}
      end
    else
      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, "HTTP request failed: #{inspect(reason)}"}
      {:error, %Jason.DecodeError{}} ->
        {:error, "Invalid JSON response"}
      {:error, reason} ->
        {:error, reason}
    end
  end

  defp parse_gitlab_url(url) do
    case Regex.run(~r{gitlab\.com/(.+)/-/merge_requests/(\d+)}, url) do
      [_, project_path, mr_iid] -> {:ok, project_path, mr_iid}
      _ -> {:error, "Invalid GitLab merge request URL"}
    end
  end

  # Construct the raw file URL from the base URL and change info
  defp get_raw_url(base_url, change) do
    # Get the SHA from the MR details that we added earlier
    sha = change["sha"]

    # Extract the project path from the base URL
    [_, project_path] = Regex.run(~r{gitlab\.com/(.+)/-/merge}, base_url)

    # Construct the raw URL using the project path and file path
    "https://gitlab.com/#{project_path}/-/raw/#{sha}/#{change["new_path"]}"
  end

  defp get_file_contents(raw_url) do
    case HTTPoison.get(raw_url) do
      {:ok, response} -> response.body
      {:error, reason} -> {:error, "Failed to fetch file contents: #{inspect(reason)}"}
    end
  end

  # Add this helper function to get repo URL (similar to GitHub's to_repo_url)
  defp get_repo_url(url) do
    case String.split(url, "/-/merge_requests") do
      [repo | _] -> "#{repo}.git"
      _ -> url
    end
  end
end
