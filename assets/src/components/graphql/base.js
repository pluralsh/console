import { gql } from "apollo-boost";

export const PageInfo = gql`
  fragment PageInfo on PageInfo {
    hasNextPage
    endCursor
  }
`;