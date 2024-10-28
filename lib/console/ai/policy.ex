defmodule Console.AI.Policy do
  use Piazza.Policy
  alias Console.Repo
  alias Console.Deployments.Policies, as: Deployments
  alias Console.Schema.{
    User,
    AiInsight,
    Chat,
    Stack,
    Service
  }

  def can?(%User{id: id}, %Chat{user_id: id}, _), do: :pass

  def can?(user, %AiInsight{} = insight, action) do
    case Repo.preload(insight, [:stack, :service]) do
      %AiInsight{stack: %Stack{} = stack} -> Deployments.can?(user, stack, action)
      %AiInsight{service: %Service{} = svc} -> Deployments.can?(user, svc, action)
      _ -> {:error, "forbidden"}
    end
  end

  def can?(user, %Ecto.Changeset{} = cs, action),
    do: can?(user, apply_changes(cs), action)

  def can?(_, _, _), do: {:error, :forbidden}
end
