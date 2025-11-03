defmodule Console.AI.Research do
  use Console.Services.Base
  alias Console.Schema.{InfraResearch, User}
  alias Console.PubSub

  @type error :: Console.error
  @type research_resp :: {:ok, InfraResearch.t} | {:error, error}

  @spec get!(binary) :: InfraResearch.t
  def get!(id), do: Repo.get!(InfraResearch, id)

  @doc """
  Creates a new research task for the given user.
  """
  @spec create_research(map, User.t) :: research_resp
  def create_research(attrs, %User{id: id}) do
    %InfraResearch{user_id: id}
    |> InfraResearch.changeset(attrs)
    |> Repo.insert()
    |> notify(:create)
  end

  defp notify({:ok, %InfraResearch{} = build}, :create),
    do: handle_notify(PubSub.InfraResearchCreated, build)
  defp notify(pass, _), do: pass
end
