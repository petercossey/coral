// Orders domain module; holds only the operations Coral features actually use.
import { gqlRequest } from './client.js';

const customerOrdersQuery = `
query GetCustomerOrders($first: Int!, $offset: Int!, $orderBy: String) {
  customerOrders(first: $first, offset: $offset, orderBy: $orderBy) {
    totalCount
    pageInfo {
      hasNextPage
      hasPreviousPage
    }
    edges {
      node {
        orderId
        createdAt
        totalIncTax
        currencyCode
        status
        statusCode
        poNumber
        firstName
        lastName
        companyName
      }
    }
  }
}`;

export async function getCustomerOrders({ first = 10, offset = 0, orderBy = '-createdAt' } = {}) {
  const data = await gqlRequest(customerOrdersQuery, { first, offset, orderBy });

  return data.customerOrders;
}
