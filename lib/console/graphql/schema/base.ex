defmodule Console.GraphQl.Schema.Base do
  use Absinthe.Schema.Notation
  import Console.GraphQl.Helpers
  require Logger

  enum :delta do
    value :create
    value :update
    value :delete
  end

  enum :direction do
    value :before
    value :after
  end

  object :metric_result do
    field :timestamp, :long, resolve: fn %{timestamp: ts}, _, _ -> {:ok, ceil(ts)} end
    field :value,     :string
  end

  object :log_stream do
    field :stream, :map
    field :values, list_of(:metric_result)
  end

  defmacro __using__(_) do
    quote do
      use Absinthe.Schema.Notation
      use Absinthe.Relay.Schema.Notation, :modern
      import Absinthe.Resolution.Helpers
      import Console.GraphQl.Schema.Helpers
      import Console.GraphQl.Schema.Base
      alias Console.Middleware.{Authenticated, AdminRequired, Rbac, Feature, ClusterAuthenticated, Scope, ErrorHandler}
    end
  end

  defmacro timestamps() do
    quote do
      field :inserted_at, :datetime
      field :updated_at, :datetime
    end
  end

  defmacro delta(type) do
    delta_type = :"#{type}_delta"
    quote do
      object unquote(delta_type) do
        field :delta, :delta
        field :payload, unquote(type)
      end
    end
  end

  defmacro ecto_enum(name, module) do
    module = Macro.expand(module, __CALLER__)
    values = module.__enum_map__()
             |> Enum.map(fn {key, _} ->
                quote do
                  value unquote(key)
                end
             end)
    quote do
      enum unquote(name) do
        unquote(values)
      end
    end
  end

  defmacro key_func(name, type, key) do
    quote do
      field unquote(name), unquote(type), resolve: fn
        obj, _, _ -> {:ok, Map.get(obj, unquote(key))}
      end
    end
  end

  defmacro service_authorized(perm) do
    quote do
      arg :service_id, :id
      middleware Console.Middleware.CdAuthenticated, perm: unquote(perm)
    end
  end

  defmacro cluster_authorized(perm) do
    quote do
      arg :cluster_id, :id
      middleware Console.Middleware.CdAuthenticated, perm: unquote(perm)
    end
  end

  defmacro hybrid_authorized(perm) do
    quote do
      arg :service_id, :id
      arg :cluster_id, :id
      middleware Console.Middleware.CdAuthenticated, perm: unquote(perm)
    end
  end

  defmacro datetime_func(name, key) do
    quote do
      field unquote(name), :datetime, resolve: fn
        %{unquote(key) => val}, _, _ when is_binary(val) -> Timex.parse(val, "{ISO:Extended}")
        %{unquote(key) => %{} = val}, _, _ -> {:ok, val}
        _, _, _ -> {:ok, nil}
      end
    end
  end

  defmacro enum_from_list(name, m, f, a) do
    module = Macro.expand(m, __CALLER__)
    values = apply(module, f, a) |> Enum.map(fn key ->
      quote do
        value unquote(key)
      end
    end)

    quote do
      enum unquote(name) do
        unquote(values)
      end
    end
  end

  def filter_loader(dataloader, func) when is_function(dataloader, 3) and is_function(func, 3) do
    fn parent, args, res ->
      with {:ok, result} <- dataloader.(parent, args, res) do
        case func.(parent, result, res) do
          l when is_list(l) -> {:ok, l}
          res -> res
        end
      end
    end
  end

  def safe_resolver(fun) when is_function(fun, 2) do
    fn args, ctx ->
      try do
        case fun.(args, ctx) do
          {:ok, res} -> {:ok, res}
          {:error, %Ecto.Changeset{} = cs} -> {:error, resolve_changeset(cs)}
          {:error, _, %{"message" => msg}} -> {:error, msg}
          error -> error
        end
      rescue
        error ->
          case Console.GraphQl.Exception.error(error) do
            {code, msg} when code >= 500 ->
              Exception.format(:error, error, __STACKTRACE__) |> Logger.error()
              {:error, msg}
            {_, msg} -> {:error, msg}
          end
      end
    end
  end

  defmacro safe_resolve(func) do
    quote do
      resolve safe_resolver(unquote(func))
    end
  end
end
