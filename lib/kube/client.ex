defmodule Kube.Client do
  alias Kube

  def list_dashboards(ns) do
    %Kazan.Request{
      method: "get",
      path: "/apis/forgelabs.sh/v1alpha1/namespaces/#{Watchman.namespace(ns)}/dashboards",
      query_params: %{},
      response_model: Kube.DashboardList
    }
    |> Kazan.run()
  end

  def list_log_filters(ns) do
    %Kazan.Request{
      method: "get",
      path: "/apis/forgelabs.sh/v1alpha1/namespaces/#{Watchman.namespace(ns)}/logfilters",
      query_params: %{},
      response_model: Kube.LogFilterList
    }
    |> Kazan.run()
  end

  def get_dashboard(ns, name) do
    %Kazan.Request{
      method: "get",
      path: "/apis/forgelabs.sh/v1alpha1/namespaces/#{Watchman.namespace(ns)}/dashboards/#{name}",
      query_params: %{},
      response_model: Kube.Dashboard
    }
    |> Kazan.run()
  end

  def get_slashcommand(ns, name) do
    %Kazan.Request{
      method: "get",
      path: IO.inspect("/apis/forgelabs.sh/v1alpha1/namespaces/#{Watchman.namespace(ns)}/slashcommands/#{name}"),
      query_params: %{},
      response_model: Kube.SlashCommand
    }
    |> Kazan.run()
  end

  def list_slashcommands() do
    %Kazan.Request{
      method: "get",
      path: "/apis/forgelabs.sh/v1alpha1/slashcommands",
      query_params: %{},
      response_model: Kube.SlashCommandList
    }
    |> Kazan.run()
  end

  def get_application(name) do
    %Kazan.Request{
      method: "get",
      path: "/apis/app.k8s.io/v1beta1/namespaces/#{Watchman.namespace(name)}/applications/#{name}",
      query_params: %{},
      response_model: Kube.Application
    }
    |> Kazan.run()
  end

  def list_applications() do
    %Kazan.Request{
      method: "get",
      path: "/apis/app.k8s.io/v1beta1/applications",
      query_params: %{},
      response_model: Kube.ApplicationList
    }
    |> Kazan.run()
  end
end
