import { createClient } from 'npm:@supabase/supabase-js@2';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};
const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed' });

  const projectUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const portoneSecret = Deno.env.get('PORTONE_API_SECRET');
  const storeId = Deno.env.get('PORTONE_STORE_ID');
  const channelKey = Deno.env.get('PORTONE_CHANNEL_KEY');
  if (!projectUrl || !anonKey || !serviceKey) return reply(503, { error: 'Server configuration is incomplete' });

  const bearer = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!bearer) return reply(401, { error: 'Sign in required' });
  const authClient = createClient(projectUrl, anonKey);
  const { data: userData, error: userError } = await authClient.auth.getUser(bearer);
  if (userError || !userData.user) return reply(401, { error: 'Session expired' });
  const userId = userData.user.id;
  const admin = createClient(projectUrl, serviceKey, { auth: { persistSession: false } });

  let input: { action?: string; identityVerificationId?: string };
  try { input = await request.json(); }
  catch { return reply(400, { error: 'Invalid request' }); }

  if (input.action === 'start') {
    if (!portoneSecret || !storeId || !channelKey) return reply(503, { error: 'PASS verification is not configured yet' });
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await admin.from('identity_verification_attempts')
      .select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', hourAgo);
    if (countError) return reply(500, { error: 'Could not start verification' });
    if ((count ?? 0) >= 5) return reply(429, { error: 'Too many attempts. Try again later.' });
    const { data, error } = await admin.from('identity_verification_attempts')
      .insert({ user_id: userId }).select('id').single();
    if (error || !data) return reply(500, { error: 'Could not start verification' });
    return reply(200, { identityVerificationId: data.id, storeId, channelKey });
  }

  if (input.action === 'complete') {
    const id = input.identityVerificationId;
    if (!id || !uuid.test(id)) return reply(400, { error: 'Invalid verification ID' });
    if (!portoneSecret) return reply(503, { error: 'PASS verification is not configured yet' });
    const { data: attempt, error: attemptError } = await admin.from('identity_verification_attempts')
      .select('status,expires_at').eq('id', id).eq('user_id', userId).single();
    if (attemptError || !attempt) return reply(404, { error: 'Verification attempt not found' });
    if (attempt.status === 'verified') return reply(200, { verified: true });
    if (Date.parse(attempt.expires_at) <= Date.now()) return reply(410, { error: 'Verification expired' });

    let providerResponse: Response;
    try {
      providerResponse = await fetch(`https://api.portone.io/identity-verifications/${encodeURIComponent(id)}`, {
        headers: { Authorization: `PortOne ${portoneSecret}` },
      });
    } catch { return reply(502, { error: 'Verification provider unavailable' }); }
    if (!providerResponse.ok) return reply(502, { error: 'Could not confirm verification' });
    const providerResult = await providerResponse.json();
    if (providerResult.status !== 'VERIFIED') return reply(409, { error: 'Verification was not completed' });

    const { data, error } = await admin.from('identity_verification_attempts')
      .update({ status: 'verified', verified_at: new Date().toISOString() })
      .eq('id', id).eq('user_id', userId).eq('status', 'pending').select('id').single();
    if (error || !data) return reply(500, { error: 'Could not save verification' });
    return reply(200, { verified: true });
  }

  return reply(400, { error: 'Unknown action' });
});
