defmodule Watchman.Forge.Users do
  use Watchman.Forge.Base

  defmodule Query, do: defstruct [:me]

  def me() do
    me_query()
    |> Client.run(%{}, %Query{})
    |> case do
      {:ok, %Query{me: me}} -> {:ok, me}
      error -> error
    end
  end
end
