import { GQLResponseHandler } from '@ctypes/graphql'

interface CreateBuildResponse {
  id: string
  insertedAt: string
  message: string
  repository: string
  status: string
  type: string
  creator: CreateBuildCreator
}

interface CreateBuildCreator {
  email: string
  id: string
  name: string
}

export class CreateBuildQueryResponse implements GQLResponseHandler {
  private _idKey = 'createBuildID'

  get id(): string {
    return Cypress.env(this._idKey)
  }

  handle({ createBuild }: { createBuild: CreateBuildResponse }): void {
    Cypress.env(this._idKey, createBuild.id)
  }
}
