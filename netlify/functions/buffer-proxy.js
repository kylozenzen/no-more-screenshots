exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    const { token } = JSON.parse(event.body || '{}');
    if (!token) return json(400, { error: 'Missing Buffer token' });

    // Demo scaffold. Replace this endpoint/query with the known-good PostIQ Buffer import.
    const response = await fetch('https://api.buffer.com/1/updates/pending.json', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return json(response.status, { error: data?.message || data?.error || 'Buffer request failed', details: data });

    const updates = Array.isArray(data.updates) ? data.updates : Array.isArray(data) ? data : [];
    const posts = updates.map(update => ({
      scheduled_at: update.due_at || update.scheduled_at || update.created_at,
      platform: update.profile_service || update.service || 'Buffer',
      channel_name: update.profile_service_username || update.profile_name || '',
      text: update.text || '',
      mediaUrl: update.media?.picture || update.media?.thumbnail || ''
    }));
    return json(200, { posts });
  } catch (error) {
    return json(500, { error: error.message || 'Unexpected error' });
  }
};
function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) };
}
