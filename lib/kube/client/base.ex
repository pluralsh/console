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

  def path_builder(g, v, k), do: "/apis/#{g}/#{v}/#{k}"
  def path_builder(g, v, k, namespace), do: "/apis/#{g}/#{v}/namespaces/#{Console.namespace(namespace)}/#{k}"
  def path_builder(g, v, k, namespace, name), do: "#{path_builder(g, v, k, namespace)}/#{name}"

  defmacro get_request(name, model) do
    quote do
      def unquote(name)(namespace, name, params \\ %{}) do
        {g, v, k} = unquote(model).gvk()
        %Kazan.Request{
          method: "get",
          path: path_builder(g, v, k, namespace, name),
          query_params: params,
          response_model: unquote(model)
        }
        |> Kazan.run()
      end
    end
  end

  defmacro create_request(name, model) do
    quote do
      def unquote(name)(resource, namespace, params \\ %{}) do
        {g, v, k} = unquote(model).gvk()
        {:ok, encoded} = unquote(model).encode(resource)
        %Kazan.Request{
          method: "post",
          path: path_builder(g, v, k, namespace),
          response_model: unquote(model),
          query_params: params,
          body: Jason.encode!(encoded),
          content_type: "application/json",
        }
        |> Kazan.run()
      end
    end
  end

  defmacro list_request(name, model) do
    quote do
      def unquote(name)(namespace, params \\ %{}) do
        {g, v, k} = unquote(model).item_model().gvk()
        %Kazan.Request{
          method: "get",
          path: path_builder(g, v, k, namespace),
          query_params: params,
          response_model: unquote(model)
        }
        |> Kazan.run()
      end
    end
  end

  defmacro list_all_request(name, model) do
    quote do
      def unquote(name)() do
        {g, v, k} = unquote(model).item_model().gvk()
        make_request("/apis/#{g}/#{v}/#{k}", "get", unquote(model))
      end
    end
  end

  defmacro delete_request(name, model) do
    quote do
      def unquote(name)(namespace, name, params \\ %{}) do
        {g, v, k} = unquote(model).gvk()
        %Kazan.Request{
          method: "delete",
          path: path_builder(g, v, k, namespace, name),
          query_params: params,
          response_model: Kazan.Models.Apimachinery.Meta.V1.Status
        }
        |> Kazan.run()
      end
    end
  end
end
