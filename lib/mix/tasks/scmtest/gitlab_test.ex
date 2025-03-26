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
    filenames = get_filenames(url)
    IO.puts("Files modified in merge request ##{merge_request_iid}:")
    Enum.each(filenames, fn {path, status, diff_content} ->
      IO.puts("- #{path} #{status}")
      IO.puts("=================================================================")
      IO.puts(Jason.encode!(diff_content, pretty: true))
      IO.puts("=================================================================")
    end)
  end

  defp get_filenames(url) do
    case HTTPoison.get(url) do
      {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
        # Parse the JSON response
        diffs = Jason.decode!(body)

        # Extract the list of changed files with their status
        Enum.map(diffs, fn diff ->
          file_status = cond do
            diff["new_file"] -> "(added)"
            diff["deleted_file"] -> "(deleted)"
            diff["renamed_file"] -> "(renamed)"
            true -> "(modified)"
          end

          {diff["new_path"], file_status, diff}  # Pass the individual diff object instead of the whole body
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
end
