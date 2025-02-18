defmodule Console.AI.Service do
  use Console.Services.Base
  import Console.AI.Policy
  alias Console.Schema.{User, AiInsight}

  @type ai_resp :: {:ok, AiInsight.t} | Console.error

  @doc """
  Fetches an ai insight and ensures a user has access to its associated resource
  """
  @spec authorized(binary, User.t) :: ai_resp
  def authorized(id, %User{} = user) do
    Repo.get!(AiInsight, id)
    |> allow(user, :read)
  end
end
