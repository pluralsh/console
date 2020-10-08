defmodule Watchman.Kube.Client do
  alias Watchman.Kube

  def list_dashboards(namespace) do
    %Kazan.Request{
      method: "get",
      path: "/apis/forgelabs.sh/v1alpha1/namespaces/#{namespace}/dashboards",
      query_params: %{},
      response_model: Kube.DashboardList
    }
    |> Kazan.run()
  end

  def get_dashboard(namespace, name) do
    %Kazan.Request{
      method: "get",
      path: "/apis/forgelabs.sh/v1alpha1/namespaces/#{namespace}/dashboards/#{name}",
      query_params: %{},
      response_model: Kube.Dashboard
    }
    |> Kazan.run()
  end
end