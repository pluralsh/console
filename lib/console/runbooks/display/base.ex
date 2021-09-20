defmodule Console.Runbooks.Display.Base do
  defmacro __using__(_) do
    quote do
      import Console.Runbooks.Display.Base

      def validate(structured_message),
        do: validate(__MODULE__, structured_message)
    end
  end

  def validate(schema, %{"_type" => "root", "children" => children} = root) when is_list(children),
    do: validate_children(schema, children, root)
  def validate(_, _), do: {:fail, "display must begin with a <root> element"}

  def validate_children(_, [], _), do: :pass
  def validate_children(schema, [child | children], parent) do
    with :pass <- validate_child(schema, child, parent),
      do: validate_children(schema, children, parent)
  end

  def validate_child(schema, %{"_type" => type} = component, parent) do
    with :pass <- validate_attrs(schema, type, component),
         :pass <- validate_parent(schema, type, parent),
      do: validate_children(schema, Map.get(component, "children", []), component)
  end

  defp validate_attrs(schema, type, %{"attributes" => attrs}) when is_map(attrs) do
    case is_subset(Map.keys(attrs), schema.__schema__(type, :attributes)) do
      :pass -> :pass
      :fail -> {:fail, "Invalid attributes [#{Enum.join(Map.keys(attrs), ", ")}] for component #{type}"}
    end
  end
  defp validate_attrs(schema, type, _) do
    case schema.__schema__(type, :attributes) do
      :__invalid__ -> {:fail, "invalid type #{type}"}
      _ -> :pass
    end
  end

  defp validate_parent(schema, type, %{"_type" => parent_type}) do
    case is_subset([parent_type], schema.__schema__(type, :parents)) do
      :pass -> :pass
      :fail -> {:fail, "#{type} cannot be a child of #{parent_type}"}
    end
  end

  defp is_subset(_, :__invalid__), do: {:fail, "invalid type"}
  defp is_subset(values, allowed) do
    MapSet.new(values)
    |> MapSet.subset?(allowed)
    |> case do
      true -> :pass
      false -> :fail
    end
  end

  defmacro schema(do: block) do
    quote do
      unquote(block)
      def __schema__(_, _), do: :__invalid__
    end
  end


  defmacro component(type, do: block) do
    quote do
      @current_type unquote(type)
      unquote(block)
    end
  end

  defmacro attributes(attrs) do
    quote do
      def __schema__(@current_type, :attributes), do: MapSet.new(unquote(attrs))
    end
  end

  defmacro parents(parents) do
    quote do
      def __schema__(@current_type, :parents), do: MapSet.new(unquote(parents))
    end
  end
end
