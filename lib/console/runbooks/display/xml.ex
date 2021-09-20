defmodule Console.Runbooks.Display.Xml do
  import SweetXml

  def from_xml(doc) do
    try do
      {:ok, parse(doc) |> mapify()}
    catch
      :exit, _value -> {:error, "invalid xml"}
    end
  end

  defp mapify(xmlElement(name: name, attributes: attributes, content: [])),
    do: base_node(name, attributes)
  defp mapify(xmlElement(name: name, attributes: attributes, content: [xmlText(value: value)])) do
    base_node(name, attributes)
    |> put_in(["attributes", "value"], to_string(value))
  end
  defp mapify(xmlElement(name: name, attributes: attributes, content: children)) do
    children = Enum.map(children, &mapify/1) |> Enum.filter(& &1)

    base_node(name, attributes)
    |> Map.put("children", children)
  end
  defp mapify(_), do: nil

  defp base_node(node, attributes) do
    %{
      "_type" => to_string(node),
      "attributes" => Enum.into(attributes, %{}, fn
        xmlAttribute(name: name, value: value) -> {to_string(name), to_string(value)}
      end),
    }
  end
end
