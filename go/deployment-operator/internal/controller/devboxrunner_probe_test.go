package controller

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/probe"
)

func TestConfigMapProbeClientTokenLifecycle(t *testing.T) {
	ctx := context.Background()
	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatal(err)
	}
	c := fake.NewClientBuilder().WithScheme(scheme).Build()
	console := newFakeDevboxConsole()
	now := time.Now()
	pc := &ConfigMapProbeClient{Client: c, Namespace: devboxTestNamespace, Tokens: console, Now: func() time.Time { return now }}
	req := DevboxProbeRequest{Request: probe.Request{Runner: "platform", Atespace: "a", ActorTemplate: "platform-r1", Revision: 1, GoldenTag: "g", DevboxID: "box-1"}}
	key := DevboxProbeConfigMapName("platform", 1)

	token := func() probe.Token {
		t.Helper()
		s := &corev1.Secret{}
		if err := c.Get(ctx, client.ObjectKey{Name: DevboxProbeTokenSecretName, Namespace: devboxTestNamespace}, s); err != nil {
			t.Fatal(err)
		}
		var tok probe.Token
		if raw, ok := s.Data[key]; ok {
			_ = json.Unmarshal(raw, &tok)
		}
		return tok
	}

	if err := pc.Request(ctx, req); err != nil {
		t.Fatal(err)
	}
	cm := &corev1.ConfigMap{}
	if err := c.Get(ctx, client.ObjectKey{Name: key, Namespace: devboxTestNamespace}, cm); err != nil {
		t.Fatal(err)
	}
	var written probe.Request
	if err := json.Unmarshal([]byte(cm.Data[DevboxProbeRequestKey]), &written); err != nil || written.TokenSecret == nil || written.TokenSecret.Key != key {
		t.Fatalf("request %s: %v", cm.Data[DevboxProbeRequestKey], err)
	}
	first := token()
	if first.Token == "" || console.mintCount() != 1 {
		t.Fatalf("token %+v after %d mints", first, console.mintCount())
	}

	if err := pc.Request(ctx, req); err != nil || console.mintCount() != 1 {
		t.Fatalf("a valid token must not be re-minted: %v, %d mints", err, console.mintCount())
	}
	now = first.ExpiresAt.Add(-5 * time.Minute)
	if err := pc.Request(ctx, req); err != nil || console.mintCount() != 2 || token().Token == first.Token {
		t.Fatalf("a token close to expiry must be re-minted while the probe is pending: %v, %d mints", err, console.mintCount())
	}

	cm.Annotations = map[string]string{DevboxProbeStateAnnotation: DevboxProbeStateDone}
	if err := c.Update(ctx, cm); err != nil {
		t.Fatal(err)
	}
	now = now.Add(time.Hour)
	if err := pc.Request(ctx, req); err != nil || console.mintCount() != 2 {
		t.Fatalf("finished probes need no token: %v, %d mints", err, console.mintCount())
	}
	if err := pc.ReleaseToken(ctx, "platform", 1); err != nil || token().Token != "" {
		t.Fatalf("ReleaseToken: %v, %+v", err, token())
	}
	if err := pc.Cleanup(ctx, "platform", 1); err != nil {
		t.Fatal(err)
	}
	if err := c.Get(ctx, client.ObjectKey{Name: key, Namespace: devboxTestNamespace}, &corev1.ConfigMap{}); !apierrors.IsNotFound(err) {
		t.Fatalf("Cleanup must delete the request: %v", err)
	}
}

func TestConfigMapProbeClientNeedsRegisteredDevbox(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)
	pc := &ConfigMapProbeClient{Client: fake.NewClientBuilder().WithScheme(scheme).Build(), Namespace: devboxTestNamespace, Tokens: newFakeDevboxConsole()}
	if err := pc.Request(context.Background(), DevboxProbeRequest{Request: probe.Request{Runner: "r", Revision: 1}}); err == nil {
		t.Fatal("a probe token can't be minted without a console Devbox")
	}
}
