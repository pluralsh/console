defmodule Console.Deployments.Git.Utils do
  import Ecto.Changeset

  def validate_private_key(cs, field) do
    case get_change(cs, field) do
      key when is_binary(key) -> put_change(cs, field, normalize_pk(key))
      _ -> cs
    end
    |> validate_change(field, fn _, val ->
      case :public_key.pem_decode(val) do
        [_ | _] -> []
        _ -> [{field, "is in an incorrect PEM format"}]
      end
    end)
  end

  def normalize_pk(pk), do: "#{String.trim_trailing(pk)}\n\n"
end
