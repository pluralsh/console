defmodule Console.Plural.Repositories do
  use Console.Plural.Base
  alias Console.Plural.{Connection, Edge, PageInfo, Installation, Repository, Dashboard}

  defmodule Query, do: defstruct [:installations]

  def list_installations(first, cursor) do
    installation_query()
    |> Client.run(
      prune_variables(%{cursor: cursor, first: first}),
      %Query{installations: %Connection{
        pageInfo: %PageInfo{},
        edges: [
          %Edge{node: %Installation{
            repository: %Repository{dashboards: [%Dashboard{}]}
          }
        }]
      }}
    )
    |> case do
      {:ok, %Query{installations: installations}} -> {:ok, installations}
      error -> error
    end
  end
end
