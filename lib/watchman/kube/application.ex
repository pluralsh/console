defmodule Watchman.Kube.Application do
  use Kazan.Model

  defmodule ComponentKind do
    use Kazan.Model

    defmodel "ComponentKind", "app.k8s.io", "v1beta1" do
      property :group, "group", :string
      property :kind, "kind", :string
    end
  end

  defmodule Icon do
    use Kazan.Model

    defmodel "Icon", "app.k8s.io", "v1beta1" do
      property :src, "src", :string
    end
  end

  defmodule Descriptor do
    use Kazan.Model
    alias Watchman.Kube.Application

    defmodel "Descriptor", "app.k8s.io", "v1beta1" do
      property :type, "type", :string
      property :version, "version", :string
      property :description, "description", :string
      property :icons, "icons", {:array, Application.Icon}
    end
  end

  defmodule Spec do
    use Kazan.Model
    alias Watchman.Kube.Application

    defmodel "ApplicationSpec", "app.k8s.io", "v1beta1" do
      property :component_kinds, "componentKinds", {:array, Application.ComponentKind}
      property :descriptor, "descriptor", Application.Descriptor
    end
  end

  defmodule Component do
    use Kazan.Model

    defmodel "Component", "app.k8s.io", "v1beta1" do
      property :group,  "group", :string
      property :kind,   "kind", :string
      property :name,   "name", :string
      property :status, "status", :string
    end
  end

  defmodule Condition do
    use Kazan.Model

    defmodel "Condition", "app.k8s.io", "v1beta1" do
      property :message,  "message", :string
      property :reason,   "reason",  :string
      property :status,   "status",  :string
      property :type,     "type",    :string
    end
  end

  defmodule Status do
    use Kazan.Model
    alias Watchman.Kube.Application

    defmodel "ApplicationStatus", "app.k8s.io", "v1beta1" do
      property :components, "components", {:array, Application.Component}
      property :conditions, "conditions", {:array, Application.Condition}
      property :components_ready, "componentsReady", :string
    end
  end

  defmodel "Application", "app.k8s.io", "v1beta1" do
    property :spec,   "spec", Spec
    property :status, "status", Status
  end
end

defmodule Watchman.Kube.ApplicationList do
  use Kazan.Model

  defmodellist "ApplicationList",
               "app,k8s.io",
               "v1beta1",
               Watchman.Kube.Application
end