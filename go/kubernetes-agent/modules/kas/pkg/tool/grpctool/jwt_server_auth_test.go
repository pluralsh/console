package grpctool_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/grpctool"
	"github.com/pluralsh/kubernetes-agent/pkg/tool/testing/mock_rpc"
)

const (
	jwtAudience  = "valid_audience"
	jwtIssuer    = "valid_issuer"
	jwtValidFor  = 5 * time.Second
	jwtNotBefore = 1 * time.Second

	expectedReq    int32 = 345
	expectedResult int16 = 125

	expectedSrv int32 = 13123
)

var (
	secret = []byte("some random secret")
)

func TestJWTServerAuth(t *testing.T) {
	unaryInfo := &grpc.UnaryServerInfo{
		FullMethod: "bla",
	}
	streamInfo := &grpc.StreamServerInfo{
		FullMethod: "bla",
	}
	t.Run("happy path", func(t *testing.T) {
		jwtAuther := setupAuther(t)

		now := time.Now()
		claims := validClams(now)
		signedClaims, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
		require.NoError(t, err)

		ctx := metadata.NewIncomingContext(context.Background(), metadata.Pairs("authorization", "bearer "+signedClaims))
		result, err := jwtAuther.UnaryServerInterceptor(ctx, expectedReq, unaryInfo, unaryHandler(ctx, t))
		require.NoError(t, err)
		assert.Equal(t, expectedResult, result)

		ctrl := gomock.NewController(t)
		stream := mock_rpc.NewMockServerStream(ctrl)
		stream.EXPECT().Context().Return(ctx)
		err = jwtAuther.StreamServerInterceptor(expectedSrv, stream, streamInfo, streamHandler(stream, t))
		require.NoError(t, err)
	})
	t.Run("missing header", func(t *testing.T) {
		jwtAuther := setupAuther(t)

		_, err := jwtAuther.UnaryServerInterceptor(context.Background(), expectedReq, unaryInfo, unaryMustNotBeCalled(t))
		require.EqualError(t, err, "rpc error: code = Unauthenticated desc = Request unauthenticated with bearer")

		ctrl := gomock.NewController(t)
		stream := mock_rpc.NewMockServerStream(ctrl)
		stream.EXPECT().Context().Return(context.Background())
		err = jwtAuther.StreamServerInterceptor(expectedSrv, stream, streamInfo, streamMustNotBeCalled(t))
		require.EqualError(t, err, "rpc error: code = Unauthenticated desc = Request unauthenticated with bearer")
	})
	t.Run("invalid token type", func(t *testing.T) {
		jwtAuther := setupAuther(t)

		now := time.Now()
		claims := validClams(now)
		signedClaims, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
		require.NoError(t, err)

		ctx := metadata.NewIncomingContext(context.Background(), metadata.Pairs("authorization", "weird_type "+signedClaims))
		_, err = jwtAuther.UnaryServerInterceptor(ctx, expectedReq, unaryInfo, unaryMustNotBeCalled(t))
		require.EqualError(t, err, "rpc error: code = Unauthenticated desc = Request unauthenticated with bearer")

		ctrl := gomock.NewController(t)
		stream := mock_rpc.NewMockServerStream(ctrl)
		stream.EXPECT().Context().Return(ctx)
		err = jwtAuther.StreamServerInterceptor(expectedSrv, stream, streamInfo, streamMustNotBeCalled(t))
		require.EqualError(t, err, "rpc error: code = Unauthenticated desc = Request unauthenticated with bearer")
	})
	t.Run("unexpected signing algorithm", func(t *testing.T) {
		jwtAuther := setupAuther(t)

		now := time.Now()
		claims := validClams(now)

		keyData, err := os.ReadFile("testdata/sample_key")
		require.NoError(t, err)
		rsaKey, err := jwt.ParseRSAPrivateKeyFromPEM(keyData)
		require.NoError(t, err)
		signedClaims, err := jwt.NewWithClaims(jwt.SigningMethodRS256, claims).SignedString(rsaKey)
		require.NoError(t, err)

		assertValidationFailed(t, signedClaims, jwtAuther)
	})
	t.Run("none signing algorithm", func(t *testing.T) {
		jwtAuther := setupAuther(t)

		now := time.Now()
		claims := validClams(now)
		signedClaims, err := jwt.NewWithClaims(jwt.SigningMethodNone, claims).SignedString(jwt.UnsafeAllowNoneSignatureType)
		require.NoError(t, err)

		assertValidationFailed(t, signedClaims, jwtAuther)
	})
	t.Run("unexpected audience", func(t *testing.T) {
		jwtAuther := setupAuther(t)

		now := time.Now()
		claims := validClams(now)
		claims.Audience = jwt.ClaimStrings{"blablabla"}
		signedClaims, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
		require.NoError(t, err)

		assertValidationFailed(t, signedClaims, jwtAuther)
	})
	t.Run("unexpected issuer", func(t *testing.T) {
		jwtAuther := setupAuther(t)

		now := time.Now()
		claims := validClams(now)
		claims.Issuer = "blablabla"
		signedClaims, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
		require.NoError(t, err)

		assertValidationFailed(t, signedClaims, jwtAuther)
	})
}

func setupAuther(t *testing.T) *grpctool.JWTAuther {
	return grpctool.NewJWTAuther(secret, jwtIssuer, jwtAudience, func(ctx context.Context) *zap.Logger {
		return zaptest.NewLogger(t)
	})
}

func assertValidationFailed(t *testing.T, signedClaims string, jwtAuther *grpctool.JWTAuther) {
	unaryInfo := &grpc.UnaryServerInfo{
		FullMethod: "bla",
	}
	streamInfo := &grpc.StreamServerInfo{
		FullMethod: "bla",
	}
	ctx := metadata.NewIncomingContext(context.Background(), metadata.Pairs("authorization", "bearer "+signedClaims))
	_, err := jwtAuther.UnaryServerInterceptor(ctx, expectedReq, unaryInfo, unaryMustNotBeCalled(t))
	require.EqualError(t, err, "rpc error: code = Unauthenticated desc = JWT validation failed")

	ctrl := gomock.NewController(t)
	stream := mock_rpc.NewMockServerStream(ctrl)
	stream.EXPECT().Context().Return(ctx)
	err = jwtAuther.StreamServerInterceptor(expectedSrv, stream, streamInfo, streamMustNotBeCalled(t))
	require.EqualError(t, err, "rpc error: code = Unauthenticated desc = JWT validation failed")
}

func validClams(now time.Time) jwt.RegisteredClaims {
	claims := jwt.RegisteredClaims{
		Issuer:    jwtIssuer,
		Audience:  jwt.ClaimStrings{jwtAudience},
		ExpiresAt: jwt.NewNumericDate(now.Add(jwtValidFor)),
		NotBefore: jwt.NewNumericDate(now.Add(-jwtNotBefore)),
		IssuedAt:  jwt.NewNumericDate(now),
	}
	return claims
}

func unaryHandler(expectedCtx context.Context, t *testing.T) grpc.UnaryHandler {
	return func(ctx context.Context, req interface{}) (interface{}, error) {
		assert.Equal(t, expectedReq, req)
		assert.Equal(t, expectedCtx, ctx)

		return expectedResult, nil
	}
}

func streamHandler(expectedStream grpc.ServerStream, t *testing.T) grpc.StreamHandler {
	return func(srv interface{}, stream grpc.ServerStream) error {
		assert.Equal(t, expectedSrv, srv)
		assert.Equal(t, expectedStream, stream)

		return nil
	}
}

func unaryMustNotBeCalled(t *testing.T) grpc.UnaryHandler {
	return func(ctx context.Context, req interface{}) (interface{}, error) {
		require.FailNow(t, "handler must not be called")
		return nil, nil
	}
}

func streamMustNotBeCalled(t *testing.T) grpc.StreamHandler {
	return func(srv interface{}, stream grpc.ServerStream) error {
		require.FailNow(t, "handler must not be called")
		return nil
	}
}
