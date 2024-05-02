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
  alias Console.Helm.Chart

  defstruct [:oci, :entries, :apiVersion]

  def transform(%__MODULE__{entries: %{} = entries} = repo) do
    entries = Enum.map(entries, fn {name, charts} ->
      %{name: name, versions: Enum.map(charts, &Chart.build/1)}
    end)
    %{repo | entries: entries}
  end
  def transform(pass), do: pass
end
