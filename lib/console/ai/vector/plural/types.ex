defmodule Console.AI.Vector.Plural.Passage do
  @type t :: %__MODULE__{text: binary | nil, vector: [float] | nil}

  defstruct [:text, :vector]

  defimpl Jason.Encoder do
    def encode(passage, opts), do: Jason.Encode.map(Console.drop_nils(Map.from_struct(passage)), opts)
  end
end

defmodule Console.AI.Vector.Plural.Document do
  alias Console.AI.Vector.Plural.Passage

  @type t :: %__MODULE__{id: binary, attributes: map, passages: [Passage.t]}

  @derive Jason.Encoder
  defstruct [:id, attributes: %{}, passages: []]
end

defmodule Console.AI.Vector.Plural.Delete do
  @type t :: %__MODULE__{filter: map}

  @derive Jason.Encoder
  defstruct [:filter]
end

defmodule Console.AI.Vector.Plural.Write do
  alias Console.AI.Vector.Plural.Document

  @type t :: %__MODULE__{upsert_documents: [Document.t] | nil, delete_by_filter: map | nil}

  defstruct [:upsert_documents, :delete_by_filter]

  defimpl Jason.Encoder do
    def encode(write, opts), do: Jason.Encode.map(Console.drop_nils(Map.from_struct(write)), opts)
  end
end
