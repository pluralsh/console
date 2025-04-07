defmodule Mix.Tasks.Scm.Bitbucket do
  use Mix.Task

  @bitbucket_api_url "https://api.bitbucket.org/2.0"

  def run(_args) do
    url = "https://bitbucket.org/kinjal_test_ws/test_repo/pull-requests/1"
    HTTPoison.start()

    case get_pr_info(url) do
      {:ok, pr_info} ->
        # Pretty print the changes info
        IO.puts("\nPull Request Changes Information:")
        File.write("bitbucket_pr_info.json", Jason.encode!(pr_info, pretty: true))

        # Get the diff URL from the PR info
        diff_url = pr_info["links"]["diff"]["href"]
        IO.puts("Diff URL: #{diff_url}")

        # Fetch the diff content and create a map of filenames to diffs
        diff_map = get_diff_map(diff_url)

        diffstat_url = pr_info["links"]["diffstat"]["href"]
        IO.puts(diffstat_url)

        case files_diff_list(diffstat_url) do
          {:ok, diff_list} ->
            file_map = Enum.map(diff_list["values"], fn file ->
              filename = file["new"]["escaped_path"]

              %{
                url: url,
                repo: pr_info["source"]["repository"]["full_name"],
                title: pr_info["title"],
                contents: get_file_from_raw(file["new"]["links"]["self"]["href"]),
                filename: filename,
                sha: pr_info["source"]["commit"]["hash"],
                patch: Map.get(diff_map, filename, "No diff found for #{filename}"),
                base: pr_info["destination"]["branch"]["name"],
                head: pr_info["source"]["branch"]["name"]
              }
            end)

            # Print the file map in a readable format
            IO.puts("\nFile Properties:")
            Enum.each(file_map, fn file ->
              IO.puts("\n--- #{file.filename} ---")
              Enum.each(Map.to_list(file), fn {key, value} ->
                # Truncate long values for better readability
                display_value = case value do
                  nil -> "nil"
                  str when is_binary(str) and byte_size(str) > 100 ->
                    String.slice(str, 0..100) <> "..."
                  other -> inspect(other)
                end
                IO.puts("#{key}: #{display_value}")
              end)
            end)
          {:error, error} -> IO.puts("Error fetching diffstat: #{inspect(error)}")
        end

      {:error, reason} ->
        IO.puts("Error: #{reason}")
    end
  end

  defp get_pr_info(url) do
    with {:ok, workspace, repo_slug, pr_id} <- parse_bitbucket_url(url),
         pr_url = get_pr_url(workspace, repo_slug, pr_id),
         {:ok, pr_response} <- HTTPoison.get(pr_url, [{"Content-Type", "application/json"}]),
         {:ok, pr_body} <- Jason.decode(pr_response.body) do
      {:ok, pr_body}
    else
      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, "HTTP request failed: #{inspect(reason)}"}
      {:error, %Jason.DecodeError{}} ->
        {:error, "Invalid JSON response"}
      {:error, reason} ->
        {:error, reason}
    end
  end

  defp files_diff_list(diffstat_url) do
    case HTTPoison.get(diffstat_url, []) do
      {:ok, response} -> Jason.decode(response.body)
      {:error, error} -> IO.puts("Error fetching diffstat: #{inspect(error)}")
    end
  end

  defp parse_bitbucket_url(url) do
    case Regex.run(~r{bitbucket\.org/([^/]+)/([^/]+)/pull-requests/(\d+)}, url) do
      [_, workspace, repo_slug, pr_id] -> {:ok, workspace, repo_slug, pr_id}
      _ -> {:error, "Invalid Bitbucket pull request URL"}
    end
  end

  defp get_pr_url(workspace, repo_slug, pr_id) do
    "#{@bitbucket_api_url}/repositories/#{workspace}/#{repo_slug}/pullrequests/#{pr_id}"
  end

  defp get_file_from_raw(url) do
    case HTTPoison.get(url, []) do
      {:ok, response} -> response.body
      {:error, error} -> IO.puts("Error fetching raw file: #{inspect(error)}")
    end
  end

  defp get_diff_map(diff_url) do
    case HTTPoison.get(diff_url, []) do
      {:ok, response} ->
        # Parse the unified diff format to extract individual file diffs
        parse_diff_to_map(response.body)
      {:error, error} ->
        IO.puts("Error fetching diff: #{inspect(error)}")
        %{}
    end
  end

  defp parse_diff_to_map(diff_content) do
    # Split the diff content by file
    diff_content
    |> String.split(~r/diff --git a\//)
    |> Enum.reject(&(&1 == ""))
    |> Enum.map(fn file_diff ->
      # Extract filename and diff content
      case Regex.run(~r/^(.+?) b\/(.+?)(?:\n|$)/, file_diff) do
        [_, _, filename] ->
          {filename, "diff --git a/" <> file_diff}
        _ ->
          # Handle new files differently
          case Regex.run(~r/^(.+?) b\/(.+?)(?:\n|$)/, "diff --git a/" <> file_diff) do
            [_, _, filename] -> {filename, "diff --git a/" <> file_diff}
            _ -> {"unknown", file_diff}
          end
      end
    end)
    |> Map.new()
  end
end
