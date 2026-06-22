defmodule Console.Policies.Base do
  defmacro __using__(_) do
    quote do
      use Piazza.Policy
      import Console.Policies.Base

      def cascade(user, resource_policies) when is_list(resource_policies) do
        cascade(__MODULE__, user, resource_policies)
      end
    end
  end


  @doc """
  Evaluates policies for all the {resource, policy} pairs in the list.  Succeeds if any of them succeed.
  """
  def cascade(mod, user, resource_policies) when is_list(resource_policies) do
    Enum.reduce_while(resource_policies, :pass, fn {resource, policy}, acc ->
      case mod.can?(user, resource, policy) do
        :pass -> {:halt, acc}
        {:error, reason} -> {:cont, {:error, reason}}
        :continue -> {:cont, acc}
      end
    end)
  end
end
