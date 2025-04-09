defmodule Mix.Tasks.Scm.Gitlab do
  use Mix.Task
<<<<<<< HEAD
=======
  require Logger
>>>>>>> git-providers

  @gitlab_api_url "https://gitlab.com/api/v4"

  def run(_args) do
    url = "https://gitlab.com/inkscape/inkscape/-/merge_requests/6978"
    HTTPoison.start()

<<<<<<< HEAD
    case get_mr_info(url) do
      {:ok, mr_info} ->
        mr_info["changes"]
        |> Enum.map(fn change ->
          raw_url = get_raw_url(url, mr_info["sha"], change)
          file_contents = get_file_contents(raw_url)

          # Create a map similar to GitHub's File struct
          file_map = %{
            url: url,                              # MR URL
            repo: get_repo_url(url),              # Repository URL
            title: mr_info["title"],              # MR title
            contents: file_contents,               # File contents
            filename: change["new_path"],          # File path
            sha: mr_info["sha"],                    # Commit SHA
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
=======
    case files(%{name: "gitlab-conn"}, url) do
      {:ok, file_list} ->
        # Iterate over each map in the list
        Enum.each(file_list, fn file_map ->
          IO.puts("--------------------------------------------------------------")
          # Iterate over each key-value pair in the map
          Enum.each(file_map, fn {key, value} ->
            display_value = cond do
              is_binary(value) and byte_size(value) > 100 ->
                String.slice(value, 0..100) <> "..."
              is_binary(value) ->
                value
              true ->
                inspect(value)
            end
            IO.puts("#{key}: #{display_value}")
          end)
          IO.puts("--------------------------------------------------------------")
>>>>>>> git-providers
        end)
      {:error, reason} ->
        IO.puts("Error: #{reason}")
    end
  end

<<<<<<< HEAD
  def get_mr_info(url) do
    with {:ok, project_id, mr_iid} <- parse_gitlab_url(url),
         encoded_project_id = URI.encode_www_form(project_id),
         # First get the MR details to get the SHA
        #  api_url = "#{@gitlab_api_url}/projects/#{encoded_project_id}/merge_requests/#{mr_iid}",
        #  {:ok, response} <- HTTPoison.get(api_url, [{"Content-Type", "application/json"}]),
        #  {:ok, mr_details} <- Jason.decode(response.body),
        #  _ <- IO.inspect(mr_details, label: "mr_details"),
         # Then get the diffs
         diffs_url = "#{@gitlab_api_url}/projects/#{encoded_project_id}/merge_requests/#{mr_iid}/changes",
         {:ok, diffs_response} <- HTTPoison.get(diffs_url, [{"Content-Type", "application/json"}]),
         {:ok, body} <- Jason.decode(diffs_response.body),
         _ <- IO.inspect(body, label: "body") do

      # Add the SHA to each change in the response
      # changes = body["changes"] || []
      # changes_with_sha = Enum.map(changes, fn change -> Map.put(change, "sha", mr_details["sha"]) end)
      # body = Map.put(body, "changes", changes_with_sha)
=======
  def files(conn, url) do
    with {:ok, group, repo, number} <- get_pull_id(url),
         {:ok, mr_info} <- get_mr_info(conn, group, repo, number) do

      res_list = Enum.map(mr_info["changes"], fn change ->
        sha = mr_info["sha"]
        file_contents = get_file_contents_from_commit(conn, "#{group}/#{repo}", change["new_path"], sha)

        %{
          url: url,                              # MR URL
          repo: get_repo_url(url),               # Repository URL
          title: mr_info["title"],               # MR title
          contents: file_contents,               # File contents
          filename: change["new_path"],          # File path
          sha: sha,                              # Commit SHA
          patch: change["diff"],                 # The diff/patch
          base: mr_info["target_branch"],        # Target branch
          head: mr_info["source_branch"]         # Source branch
        }
      end)
      {:ok, res_list}
    else
      {:error, reason} ->
        Logger.info("failed to list pr files #{inspect(reason)}")
        {:error, reason}
    end
  end

  def get_mr_info(conn, group, repo, mr_iid) do
    with {:ok, url, token} <- url_and_token(conn, @gitlab_api_url),
         api_url = extract_api_url(url),
         project_id = "#{group}/#{repo}",
         encoded_project_id = URI.encode_www_form(project_id),
         diffs_url = "#{api_url}/projects/#{encoded_project_id}/merge_requests/#{mr_iid}/changes",
         {:ok, diffs_response} <- HTTPoison.get(diffs_url, [{"PRIVATE-TOKEN", token}, {"Content-Type", "application/json"}]),
         {:ok, body} <- Jason.decode(diffs_response.body) do
>>>>>>> git-providers
      {:ok, body}
    else
      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, "HTTP request failed: #{inspect(reason)}"}
      {:error, %Jason.DecodeError{}} ->
        {:error, "Invalid JSON response"}
      {:error, reason} ->
        {:error, reason}
    end
  end

<<<<<<< HEAD
  defp parse_gitlab_url(url) do
    case Regex.run(~r{gitlab\.com/(.+)/-/merge_requests/(\d+)}, url) do
      [_, project_path, mr_iid] -> {:ok, project_path, mr_iid}
      _ -> {:error, "Invalid GitLab merge request URL"}
    end
  end

  # Construct the raw file URL from the base URL and change info
  defp get_raw_url(base_url, sha, change) do
    # Get the SHA from the MR details that we added earlier

    # Extract the project path from the base URL
    [_, project_path] = Regex.run(~r{gitlab\.com/(.+)/-/merge}, base_url)

    # Construct the raw URL using the project path and file path
    "https://gitlab.com/#{project_path}/-/raw/#{sha}/#{change["new_path"]}"
  end

  defp get_file_contents(raw_url) do
    case HTTPoison.get(raw_url) do
      {:ok, response} -> response.body
      {:error, reason} -> {:error, "Failed to fetch file contents: #{inspect(reason)}"}
=======
  defp extract_api_url(url) do
    case is_binary(url) and String.trim(url) != "" do
      true ->
        url
      false ->
        @gitlab_api_url
    end
  end

  defp get_pull_id(url) do
    with %URI{path: "/" <> path} <- URI.parse(url),
         [project_path, mr_path] <- String.split(path, "/-/"),
         [group, repo] <- String.split(project_path, "/", trim: true),
         ["merge_requests", number] <- String.split(mr_path, "/", trim: true) do
      {:ok, group, repo, number}
    else
      %URI{} -> {:error, "Invalid GitLab merge request URL: missing or invalid path"}
      _ -> {:error, "Invalid GitLab merge request URL: invalid format"}
>>>>>>> git-providers
    end
  end

  # Add this helper function to get repo URL (similar to GitHub's to_repo_url)
  defp get_repo_url(url) do
    case String.split(url, "/-/merge_requests") do
      [repo | _] -> "#{repo}.git"
      _ -> url
    end
  end
<<<<<<< HEAD
=======

  defp get_file_contents_from_commit(conn, project_id, file_path, sha) do
    with {:ok, url, token} <- url_and_token(conn, @gitlab_api_url),
         api_url = extract_api_url(url),
         encoded_project_id = URI.encode_www_form(project_id),
         encoded_file_path = URI.encode_www_form(file_path),
         url = "#{api_url}/projects/#{encoded_project_id}/repository/files/#{encoded_file_path}?ref=#{sha}",
         {:ok, response} <- HTTPoison.get(url, [{"PRIVATE-TOKEN", token}, {"Content-Type", "application/json"}]),
         {:ok, body} <- Jason.decode(response.body),
         {:ok, content} <- Base.decode64(body["content"]) do
      content
    else
      {:error, reason} ->
        Logger.info("failed to get file contents from gitlab #{inspect(reason)}")
        {:error, reason}
    end
  end

  def url_and_token(%{connection: %{} = conn}, default),
    do: url_and_token(conn, default)
  def url_and_token(%{api_url: url, token: token}, _) when is_binary(url),
    do: {:ok, url, token}
  def url_and_token(%{base_url: url, token: token}, _) when is_binary(url),
    do: {:ok, url, token}
  def url_and_token(%{token: token}, default), do: {:ok, default, token}
  def url_and_token(_, _), do: {:error, "could not set up gitlab connection"}
>>>>>>> git-providers
end
