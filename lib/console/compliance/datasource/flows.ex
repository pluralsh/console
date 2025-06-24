defmodule Console.Compliance.Datasource.Flows do
  @moduledoc """
  Datasource for compliance reports.
  """
  @behaviour Console.Compliance.Datasource
  alias Console.Schema.Flow

  @impl Console.Compliance.Datasource
  def stream do
    Flow.stream()
    |> Console.Repo.stream(method: :keyset)
    |> Stream.map(fn flow ->
      %{
        id: flow.id,
        name: flow.name,
        created_at: flow.inserted_at,
      }
    end)
  end
end
