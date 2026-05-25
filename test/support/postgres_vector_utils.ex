defmodule PostgresVectorUtils do
  import Ecto.Query

  alias Console.AI.Utils
  alias Console.Repo
  alias Console.Schema.VectorEmbedding

  def vector_settings do
    %{
      enabled: true,
      store: :postgres,
      initialized: false
    }
  end

  def vector, do: Enum.map(1..Utils.embedding_dims(), fn _ -> :rand.uniform() end)

  def count do
    VectorEmbedding
    |> select([e], count(e.id))
    |> Repo.one()
  end
end
