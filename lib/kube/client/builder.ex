defmodule Kube.Client.Builder do
  alias Kazan.Apis.Core.V1, as: CoreV1
  alias Kazan.Models.Apimachinery.Meta.V1, as: MetaV1

  defmacro __using__(_) do
    quote do
      alias Kazan.Apis.Core.V1, as: CoreV1
      alias Kazan.Models.Apimachinery.Meta.V1, as: MetaV1
      import Kube.Client.Builder
    end
  end

  def env_var(name, %CoreV1.EnvVarSource{} = source), do: %CoreV1.EnvVar{name: name, value_from: source}
  def env_var(name, value) when is_binary(value), do: %CoreV1.EnvVar{name: name, value: value}

  def object_meta(name, namespace, annotations \\ %{}, labels \\ %{}) do
    %MetaV1.ObjectMeta{
      name: name,
      namespace: namespace,
      annotations: annotations,
      labels: labels
    }
  end
end
