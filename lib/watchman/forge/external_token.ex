defmodule Watchman.Forge.ExternalToken do
  use Watchman.Forge.Base

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
