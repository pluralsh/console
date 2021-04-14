defmodule Watchman.Plural.ExternalToken do
  use Watchman.Plural.Base

  defmodule Query, do: defstruct [:externalToken]

  def fetch() do
    external_token_mutation()
    |> Client.run(%{}, %Query{})
    |> case do
      {:ok, %Query{externalToken: token}} -> {:ok, token}
      error -> error
    end
  end
end
