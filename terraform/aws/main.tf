resource "kubernetes_namespace" "watchman" {
  metadata {
    name = var.namespace
  }
}

data "aws_eks_cluster" "cluster" {
  name = var.cluster_name
}

module "assumable_role_watchman" {
  source                        = "terraform-aws-modules/iam/aws//modules/iam-assumable-role-with-oidc"
  version                       = "2.14.0"
  create_role                   = true
  role_name                     = var.role_name
  provider_url                  = replace(data.aws_eks_cluster.cluster.identity[0].oidc[0].issuer, "https://", "")
  role_policy_arns              = [aws_iam_policy.watchman.arn]
  oidc_fully_qualified_subjects = ["system:serviceaccount:${var.namespace}:${var.watchman_serviceaccount}"]
}

resource "aws_iam_policy" "watchman" {
  name_prefix = "watchman"
  description = "EKS cluster-autoscaler policy for cluster ${module.cluster.cluster_id}"
  policy      = data.aws_iam_policy_document.watchman.json
}

data "aws_iam_policy_document" "watchman" {
  statement {
    sid    = "admin"
    effect = "Allow"
    actions = ["*"]
    resources = ["*"]
  }
}