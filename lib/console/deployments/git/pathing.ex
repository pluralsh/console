defmodule Console.Deployments.Git.Pathing do
  def provider(url) do
    case Regex.run(~r/(github|gitlab)/, url) do
      [_, "github"] -> :github
      [_, "gitlab"] -> :gitlab
      _ -> nil
    end
  end

  def https_path("https://" <> _ = url), do: trim(url)
  def https_path("git@github.com:" <> rest), do: "https://github.com/#{trim(rest)}"
  def https_path("git@gitlab.com:" <> rest), do: "https://gitlab.com/#{trim(rest)}"
  def https_path(_), do: nil

  def path_format(url) do
    case provider(url) do
      :github -> "{url}/tree/{ref}/{folder}"
      :gitlab -> "{url}/-/tree/{ref}/{folder}"
      _ -> nil
    end
  end

  defp trim(url), do: String.trim_trailing(url, ".git")
end
