package egress

import (
	"encoding/base64"
	"testing"

	"google.golang.org/protobuf/types/known/structpb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

func TestRawSCMToken(t *testing.T) {
	meta := func(scheme string) *structpb.Struct {
		s, _ := structpb.NewStruct(map[string]any{"scheme": scheme, "username": "x-token-auth"})
		return s
	}
	b64 := func(s string) string { return base64.StdEncoding.EncodeToString([]byte(s)) }
	cases := []struct {
		name    string
		cred    *devboxv1.InstanceCredential
		want    string
		wantErr bool
	}{
		{name: "bearer", cred: &devboxv1.InstanceCredential{Token: "ghs_abc", Metadata: meta("bearer")}, want: "ghs_abc"},
		{name: "no metadata", cred: &devboxv1.InstanceCredential{Token: "glpat-1"}, want: "glpat-1"},
		{name: "basic", cred: &devboxv1.InstanceCredential{Token: b64("x-token-auth:bb:tok"), Metadata: meta("basic")}, want: "bb:tok"},
		{name: "basic upper-case scheme", cred: &devboxv1.InstanceCredential{Token: b64("u:t"), Metadata: meta("Basic")}, want: "t"},
		{name: "basic not base64", cred: &devboxv1.InstanceCredential{Token: "not base64!", Metadata: meta("basic")}, wantErr: true},
		{name: "basic without colon", cred: &devboxv1.InstanceCredential{Token: b64("token"), Metadata: meta("basic")}, wantErr: true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := RawSCMToken(tc.cred)
			if (err != nil) != tc.wantErr {
				t.Fatalf("err = %v, wantErr %v", err, tc.wantErr)
			}
			if got != tc.want {
				t.Fatalf("token = %q, want %q", got, tc.want)
			}
		})
	}
}
