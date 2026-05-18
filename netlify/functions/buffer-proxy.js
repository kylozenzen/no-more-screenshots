exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { token, query, variables = {} } = JSON.parse(event.body || "{}");
    if (!token || !query) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing token or query" }) };
    }

    const endpoint = process.env.BUFFER_GRAPHQL_ENDPOINT || "https://graph.buffer.com/graphql";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ query, variables })
    });

    const text = await response.text();
    return {
      statusCode: response.status,
      headers: { "Content-Type": "application/json" },
      body: text
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Buffer proxy failed" })
    };
  }
};