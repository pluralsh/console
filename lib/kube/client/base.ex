defmodule Kube.Client.Base do
  defmacro __using__(_) do
    quote do
      import Kube.Client.Base
    end
  end

  def make_request(path, verb, model, body \\ "", params \\ %{}) do
    %Kazan.Request{
      method: verb,
      path: path,
      query_params: params,
      body: body,
      content_type: "application/json",
      response_model: model
    }
    |> Kazan.run()
  end

  def path_builder(g, v, k, namespace), do: "/apis/#{g}/#{v}/namespaces/#{Console.namespace(namespace)}/#{k}"
  def path_builder(g, v, k, namespace, name), do: "#{path_builder(g, v, k, namespace)}/#{name}"

  defmacro get_request(name, model, g, v, k) do
    quote do
      def unquote(name)(namespace, name, params \\ %{}) do
        %Kazan.Request{
          method: "get",
          path: path_builder(unquote(g), unquote(v), unquote(k), namespace, name),
          query_params: params,
          response_model: unquote(model)
        }
        |> Kazan.run()
      end
    end
  end

  defmacro list_request(name, model, g, v, k) do
    quote do
      def unquote(name)(namespace, params \\ %{}) do
        %Kazan.Request{
          method: "get",
          path: path_builder(unquote(g), unquote(v), unquote(k), namespace),
          query_params: params,
          response_model: unquote(model)
        }
        |> Kazan.run()
      end
    end
  end
end
