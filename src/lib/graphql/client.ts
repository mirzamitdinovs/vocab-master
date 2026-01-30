export async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>) {
  const response = await fetch("/api/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  const result = (await response.json()) as {
    data?: T;
    errors?: { message: string }[];
  };

  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors.map((e) => e.message).join("\n"));
  }

  if (!result.data) {
    throw new Error("No data returned from GraphQL.");
  }

  return result.data;
}
