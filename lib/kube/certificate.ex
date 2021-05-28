defmodule Kube.Certificate do
  use Kazan.Model

  defmodule Status do
    use Kazan.Model

    defmodel "CertificateStatus", "cert-manager.io", "v1" do
      property :conditions,   "conditions",  {:array, Kube.Condition}
      property :not_after,    "notAfter",    :string
      property :not_before,   "notBefore",   :string
      property :renewal_time, "renewalTime", :string
    end
  end

  defmodule IssuerRef do
    use Kazan.Model

    defmodel "IssuerRef", "cert-manager.io", "v1" do
      property :group, "group", :string
      property :kind,  "kind",  :string
      property :name,  "name",  :string
    end
  end

  defmodule Spec do
    use Kazan.Model

    defmodel "CertificateSpec", "cert-manager.io", "v1" do
      property :dns_names,   "dnsNames",   {:array, :string}
      property :issuer_ref,  "issuerRef",  Kube.Certificate.IssuerRef
      property :secret_name, "secretName", :string
    end
  end

  defmodel "Certificate", "cert-manager.io", "v1" do
    property :spec,   "spec", Spec
    property :status, "status", Status
  end
end

defmodule Kube.CertificateList do
  use Kazan.Model

  defmodellist "CertificateList",
               "cert-manager.io",
               "v1",
               Kube.Certificate
end
