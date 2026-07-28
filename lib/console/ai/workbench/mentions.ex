defmodule Console.AI.Workbench.Mentions do
  alias Console.Schema.{Service, Stack}

  @spec plrl_service_mention(Service.t()) :: binary
  def plrl_service_mention(%Service{} = svc) do
    plrl_mention("plrl-service", [
      {"item-id", svc.id},
      {"item-name", svc.name},
      {"namespace", svc.namespace}
    ])
  end

  @spec plrl_stack_mention(Stack.t()) :: binary
  def plrl_stack_mention(%Stack{} = stack) do
    plrl_mention("plrl-stack", [
      {"item-id", stack.id},
      {"item-name", stack.name},
      {"type", stack.type}
    ])
  end

  defp plrl_mention(tag, [_ | _] = attrs) do
    attrs
    |> Enum.flat_map(fn
      {_, nil} -> []
      {_, ""} -> []
      {name, value} -> ["#{name}=\"#{encode_chip_attr_value(value)}\""]
    end)
    |> Enum.join(" ")
    |> then(& "<#{tag} #{&1}></#{tag}>")
  end

  defp encode_chip_attr_value(value) do
    value
    |> to_string()
    |> String.replace("\r\n", "\n")
    |> String.replace("\r", "\n")
    |> Phoenix.HTML.html_escape()
    |> Phoenix.HTML.safe_to_string()
    |> String.replace("\n", "&#10;")
    |> String.replace("\t", "&#9;")
  end
end
