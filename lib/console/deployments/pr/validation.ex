defmodule Console.Deployments.Pr.Validation do
  alias Console.Repo
  alias Console.Schema.{PrAutomation, Configuration, Project, Cluster}
  alias Console.Deployments.{Settings, Clusters}
  alias Console.Schema.Configuration.{Validation}

  def validate(%PrAutomation{configuration: [_ | _] = config}, ctx) do
    Enum.reduce_while(config, :ok, fn %Configuration{name: name} = conf, _ ->
      case do_validate(conf, ctx[name]) do
        :ok -> {:cont, :ok}
        {:error, _} = err -> {:halt, err}
      end
    end)
  end
  def validate(_, _), do: :ok

  defp do_validate(%Configuration{optional: true}, nil), do: :ok

  defp do_validate(%Configuration{type: :project, name: n}, val) when is_binary(val) do
    case Settings.get_project_by_name(val) do
      %Project{} -> :ok
      _ -> {:error, "field #{n} is not a valid project name"}
    end
  end

  defp do_validate(%Configuration{type: :cluster, name: n}, val) when is_binary(val) do
    case Clusters.get_cluster_by_handle(val) do
      %Cluster{} -> :ok
      _ -> {:error, "field #{n} is not a valid cluster handle"}
    end
  end

  defp do_validate(%Configuration{type: :int}, val) when is_integer(val), do: :ok
  defp do_validate(%Configuration{type: :bool}, val) when is_boolean(val), do: :ok

  defp do_validate(%Configuration{type: :enum, name: n, values: vals}, val) do
    case val in vals do
      true -> :ok
      false -> {:error, ~s(field "#{n}" with value "#{inspect(val)}" is not a member of {#{Enum.join(vals, ",")}})}
    end
  end

  defp do_validate(
    %Configuration{
      type: :string,
      validation: %Validation{uniq_by: %Validation.Uniq{scope: scope}}
    } = conf,
    val
  ) when is_binary(val) do
    query = scope_query(scope)
    case Repo.get_by(query, name: val) do
      %^query{} -> {:error, ~s(there is already a #{scope} with name #{val})}
      _ -> do_validate(put_in(conf.validation.uniq_by, nil), val)
    end
  end

  defp do_validate(%Configuration{type: :string, name: n, validation: %Validation{json: true}}, val) when is_binary(val) do
    case Jason.decode(val) do
      {:ok, _} -> :ok
      _ -> {:error, ~s(field "#{n}" with value "#{val}" is not a json-encoded string)}
    end
  end

  defp do_validate(%Configuration{type: :string, name: n, validation: %Validation{regex: r}}, val)
      when is_binary(r) and is_binary(val) do
    case String.match?(val, ~r/#{r}/) do
      true -> :ok
      false -> {:error, ~s(field "#{n}" with value "#{val}" does not match regex #{r})}
    end
  end

  defp do_validate(%Configuration{type: :string}, val)
    when is_binary(val) and byte_size(val) > 0, do: :ok
  defp do_validate(%Configuration{type: t, name: n}, val),
    do: {:error, ~s(field "#{n}" with value "#{inspect(val)}" does not match type #{String.upcase(to_string(t))})}

  defp scope_query(:project), do: Project
  defp scope_query(:cluster), do: Cluster
end
