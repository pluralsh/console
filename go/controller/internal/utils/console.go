package utils

import (
	"context"

	v1 "k8s.io/api/core/v1"
	k8sclient "sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

type ConsoleHelper struct {
	ctx    context.Context
	reader k8sclient.Reader
}

func (in *ConsoleHelper) IDFromRef(ref *v1.ObjectReference, resource v1alpha1.PluralResource) (*string, error) {
	if ref == nil {
		return nil, nil
	}

	err := in.reader.Get(in.ctx, k8sclient.ObjectKey{Name: ref.Name, Namespace: ref.Namespace}, resource)
	return resource.ConsoleID(), err
}

func NewConsoleHelper(ctx context.Context, k8sClient k8sclient.Client) *ConsoleHelper {
	return &ConsoleHelper{
		ctx:    ctx,
		reader: k8sClient,
	}
}
