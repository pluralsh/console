defmodule Console.Helm.Chart do
  @type t :: %__MODULE__{}
  defstruct [:app_version, :version, :urls, :name, :type, :application, :digest]

  def build(map) do
    %__MODULE__{
      app_version: map["appVersion"],
      version: map["version"],
      name: map["name"],
      type: map["type"],
      urls: map["urls"],
      application: map["application"],
      digest: map["digest"]
    }
  end
end

defmodule Console.Helm.Index do
  alias Console.Helm.{Chart, Utils}

  @type t :: %__MODULE__{}

  # etag, last_modified and sha describe the index.yaml this was parsed from, so an unchanged
  # index can be detected without parsing it again
  defstruct [:oci, :entries, :indexed, :sorted, :apiVersion, :etag, :last_modified, :sha]

  def transform(%__MODULE__{entries: %{} = entries} = repo) do
    entries = Enum.map(entries, fn {name, charts} ->
      %{name: name, versions: Enum.map(charts, &Chart.build/1)}
    end)
    %{repo | entries: entries, indexed: indexed(entries), sorted: sorted(entries)}
  end
  def transform(pass), do: pass

  defp indexed(entries) do
    Map.new(entries, fn entry ->
      {entry.name, Map.new(entry.versions, & {&1.version, &1})}
    end)
  end

  defp sorted(entries), do: Map.new(entries, &{&1.name, Utils.sort_versions(&1.versions)})
end
