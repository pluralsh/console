defmodule Watchman.Services.Plural do
  alias Watchman.Schema.Manifest

  def terraform_file(repository) do
    terraform_filename(repository)
    |> File.read()
  end

  def values_file(repository) do
    vals_filename(repository)
    |> File.read()
  end

  def update_configuration(repository, update, tool) do
    with {:ok, _} <- validate(update, tool),
         :ok <- File.write(filename(repository, tool), update),
      do: {:ok, update}
  end

  def cluster_name() do
    case project_manifest() do
      {:ok, %Manifest{cluster: cluster}} -> cluster
      _ -> ""
    end
  end

  def project_manifest() do
    f = manifest_filename()

    with {:ok, %{
      "kind" => "ProjectManifest",
      "metadata" => %{"name" => name},
      "spec" => conf
    }} <- YamlElixir.read_from_file(f) do
      {:ok, Manifest.build(name, conf)}
    else
      _ -> {:error, :not_found}
    end
  end

  def filename(repo, :helm), do: vals_filename(repo)
  def filename(repo, :terraform), do: terraform_filename(repo)

  def validate(str, :helm), do: YamlElixir.read_from_string(str)
  def validate(_, _), do: {:ok, nil}

  defp vals_filename(repository) do
    Path.join([Watchman.workspace(), repository, "helm", repository, "values.yaml"])
  end

  defp terraform_filename(repository) do
    Path.join([Watchman.workspace(), repository, "terraform", "main.tf"])
  end

  defp manifest_filename(),
    do: Path.join([Watchman.workspace(), "workspace.yaml"])
end
