defmodule Console.OCI.ManifestEntry do
  @type t :: %__MODULE__{}
  defstruct [:mediaType, :digest, :size, :platform]
end

defmodule Console.OCI.Manifest do
  defmodule V1 do
    alias Console.OCI.Layer

    @type t :: %__MODULE__{}
    defstruct [:schemaVersion, :mediaType, :layers, :config, :annotations]

    def build(%{"layers" => layers} = map) do
      %__MODULE__{
        layers: Enum.map(layers, &Layer.build/1),
        mediaType: map["mediaType"],
        schemaVersion: map["schemaVersion"],
        config: map["config"],
        annotations: map["annotations"]
      }
    end
  end

  defmodule List do
    alias Console.OCI.ManifestEntry
    @type t :: %__MODULE__{}
    defstruct [:schemaVersion, :manifests, :mediaType]

    def spec() do
      %__MODULE__{manifests: [%ManifestEntry{}]}
    end
  end

  def build(%{"layers" => [_ | _]} = man), do: __MODULE__.V1.build(man)
end


defmodule Console.OCI.Layer do
  @type t :: %__MODULE__{}
  defstruct [:mediaType, :digest, :size]

  def build(map) do
    %__MODULE__{
      mediaType: map["mediaType"],
      digest: map["digest"],
      size: map["size"],
    }
  end
end

defmodule Console.OCI.Tags do
  @type t :: %__MODULE__{}
  defstruct [:name, tags: []]

  def new(body, filter) when is_function(filter, 1) do
    %__MODULE__{
      tags: Enum.filter(body["tags"], filter),
      name: body["name"]
    }
  end

  def new(%{"tags" => tags, "name" => name}),
    do: %__MODULE__{tags: tags, name: name}

  def spec(), do: %__MODULE__{}
end
