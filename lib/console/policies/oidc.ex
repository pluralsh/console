defmodule Console.Policies.OIDC do
  use Piazza.Policy
  alias Console.Schema.{User}

  def can?(%User{roles: %{admin: true}}, _, _), do: :pass

  def can?(user, %Ecto.Changeset{} = cs, action),
    do: can?(user, apply_changes(cs), action)

  def can?(_, _, _), do: {:error, :forbidden}
end
