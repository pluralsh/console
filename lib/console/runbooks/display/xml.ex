defmodule Console.Runbooks.Display.Xml do

  def from_xml(doc) when is_binary(doc) do
    with {:ok, element, _} <- :erlsom.simple_form(doc),
      do: {:ok, parse(element)}
  end
  def from_xml(_), do: {:error, "display must be a binary xml doc"}

  def parse([{_, _, _} = elem]), do: [parse(elem)]

  def parse([value]) do
    to_string(value)
    |> String.trim()
  end

  def parse({tag, attributes, children}) do
    base = base_node(to_string(tag), attributes)

    case parse(children) do
      c when is_binary(c) -> put_in(base, ["attributes", "value"], c)
      cs -> Map.put(base, "children", cs)
    end
  end

  def parse(list) when is_list(list), do: Enum.map(list, &parse/1)

  defp base_node(node, attributes) do
    %{
      "_type" => to_string(node),
      "attributes" => Enum.into(attributes, %{}, fn
        {name, value} -> {to_string(name), to_string(value)}
      end),
    }
  end
end
