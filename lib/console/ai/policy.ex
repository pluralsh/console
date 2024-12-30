defmodule Console.AI.Policy do
  use Piazza.Policy
  alias Console.Repo
  alias Console.Deployments.Policies, as: Deployments
  alias Console.Schema.{
    User,
    AiInsight,
    Chat,
    ChatThread,
    Stack,
    Service,
    AiPin
  }

  def can?(%User{id: id}, %AiPin{user_id: id}, _), do: :pass

  def can?(%User{id: id}, %Chat{user_id: id}, _), do: :pass
  def can?(%User{id: id}, %ChatThread{user_id: id}, _), do: :pass

  def can?(%User{} = u, %Service{} = svc, action), do: Deployments.can?(u, svc, action)

  def can?(%User{} = u, %Stack{} = stack, action), do: Deployments.can?(u, stack, action)

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
