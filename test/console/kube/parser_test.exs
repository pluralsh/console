defmodule Kube.ParserTest do
  use Console.DataCase, async: true

  test "it will correctly parse a crd" do
    spec_model = Kube.Postgresql.Spec.model_desc()
    assert spec_model.module_name == Kube.Postgresql.Spec
    assert spec_model.properties.clone.type == Kube.Postgresql.Spec.Clone

    model = Kube.Postgresql.model_desc()
    assert model.module_name == Kube.Postgresql
    assert model.properties.spec.type == Kube.Postgresql.Spec
  end
end
