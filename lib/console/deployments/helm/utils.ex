defmodule Console.Deployments.Helm.Utils do
  alias Console.Deployments.Tar

  def clean_chart(path, to, chart) when is_binary(path) do
    file = File.open!(path)
    try do
      clean_chart(file, to, chart)
    after
      File.close(file)
    end
  end

  def clean_chart(f, to, chart) do
    with {:ok, contents} <- Tar.tar_stream(f),
      do: Tar.tarball(to, remove_prefix(contents, chart))
  end

  defp remove_prefix(contents, chart) do
    Enum.map(contents, fn {path, content} ->
      {String.trim_leading(path, "#{chart}/"), content}
    end)
  end
end
