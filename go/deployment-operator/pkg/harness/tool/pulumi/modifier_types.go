package pulumi

import (
	v1 "github.com/pluralsh/console/go/deployment-operator/pkg/harness/tool/v1"
)

type PreviewArgsModifier struct {
	v1.DefaultModifier

	planFile  string
	stackName string
	parallel  *int64
	refresh   *bool
}

type UpArgsModifier struct {
	v1.DefaultModifier

	planFile  string
	stackName string
	parallel  *int64
	refresh   *bool
}

type DestroyPreviewArgsModifier struct {
	v1.DefaultModifier

	stackName string
	parallel  *int64
	refresh   *bool
}

type DestroyArgsModifier struct {
	v1.DefaultModifier

	stackName string
	parallel  *int64
	refresh   *bool
}

func (in *Pulumi) NewPreviewArgsModifier(planFileName string) v1.Modifier {
	return &PreviewArgsModifier{
		planFile:  planFileName,
		stackName: in.stackName,
		parallel:  in.parallel,
		refresh:   in.refresh,
	}
}

func (in *Pulumi) NewUpArgsModifier(planFileName string) v1.Modifier {
	return &UpArgsModifier{
		planFile:  planFileName,
		stackName: in.stackName,
		parallel:  in.parallel,
		refresh:   in.refresh,
	}
}

func (in *Pulumi) NewDestroyPreviewArgsModifier() v1.Modifier {
	return &DestroyPreviewArgsModifier{
		stackName: in.stackName,
		parallel:  in.parallel,
		refresh:   in.refresh,
	}
}

func (in *Pulumi) NewDestroyArgsModifier() v1.Modifier {
	return &DestroyArgsModifier{
		stackName: in.stackName,
		parallel:  in.parallel,
		refresh:   in.refresh,
	}
}
