defmodule Console.Schema.WorkbenchJobAssociationTest do
  use Console.DataCase, async: true

  alias Console.Schema.WorkbenchJobAssociation

  describe "changeset/2" do
    test "accepts dashboard and monitor associations" do
      job_id = Ecto.UUID.generate()

      assert WorkbenchJobAssociation.changeset(%WorkbenchJobAssociation{}, %{
               workbench_job_id: job_id,
               dashboard_id: Ecto.UUID.generate()
             }).valid?

      assert WorkbenchJobAssociation.changeset(%WorkbenchJobAssociation{}, %{
               workbench_job_id: job_id,
               monitor_id: Ecto.UUID.generate()
             }).valid?
    end

    test "requires a job and an associated resource" do
      changeset = WorkbenchJobAssociation.changeset(%WorkbenchJobAssociation{}, %{})

      refute changeset.valid?
      assert "can't be blank" in errors_on(changeset).workbench_job_id
      assert "a dashboard or monitor must be associated" in errors_on(changeset).base
    end
  end
end
