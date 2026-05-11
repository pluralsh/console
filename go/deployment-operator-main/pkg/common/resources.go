package common

import (
	"context"
	"fmt"

	"github.com/pluralsh/console/go/polly/algorithms"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	ctrclient "sigs.k8s.io/controller-runtime/pkg/client"

	controllercommon "github.com/pluralsh/deployment-operator/pkg/controller/common"
)

func ListResources(ctx context.Context, k8sClient ctrclient.Client, gvk schema.GroupVersionKind, opts []ctrclient.ListOption) *algorithms.Pager[unstructured.Unstructured] {
	fetch := func(page *string, size int64) ([]unstructured.Unstructured, *algorithms.PageInfo, error) {
		list := &unstructured.UnstructuredList{}
		list.SetGroupVersionKind(gvk)

		if page != nil {
			opts = append(opts, ctrclient.Continue(*page))
		}
		opts = append(opts, ctrclient.Limit(size))
		// List resources
		if err := k8sClient.List(ctx, list, opts...); err != nil {
			return nil, nil, fmt.Errorf("failed to list resources: %w", err)
		}
		pageInfo := &algorithms.PageInfo{
			HasNext:  list.GetContinue() != "",
			After:    lo.ToPtr(list.GetContinue()),
			PageSize: size,
		}
		return list.Items, pageInfo, nil
	}
	return algorithms.NewPager[unstructured.Unstructured](controllercommon.DefaultPageSize, fetch)
}
