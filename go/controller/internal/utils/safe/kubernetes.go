package safe

import (
	"context"
	"fmt"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
	ctrlruntimeclient "sigs.k8s.io/controller-runtime/pkg/client"
)

func GetSecretKey(ctx context.Context, client ctrlruntimeclient.Client, selector *corev1.SecretKeySelector, namespace string) (string, error) {
	secret := &corev1.Secret{}
	if err := client.Get(ctx, types.NamespacedName{Name: selector.Name, Namespace: namespace}, secret); err != nil {
		return "", err
	}

	key, exists := secret.Data[selector.Key]
	if !exists {
		return "", fmt.Errorf("secret %s does not contain key %s", selector.Name, selector.Key)
	}

	return string(key), nil
}
