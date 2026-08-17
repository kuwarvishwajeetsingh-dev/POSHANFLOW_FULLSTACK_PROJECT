import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) throw new Error('You must be signed in.');
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const { data: { user: caller } } = await client.auth.getUser();
    if (!caller) throw new Error('Your session is invalid.');
    const { data: callerProfile } = await client.from('profiles').select('role, status').eq('id', caller.id).single();
    if (!callerProfile || callerProfile.status !== 'active' || !['inspector', 'admin'].includes(callerProfile.role)) throw new Error('Only a District Inspector can create teacher accounts.');

    const { fullName, email, password, schoolId, role } = await request.json();
    if (!fullName?.trim() || !email?.trim() || !password || !schoolId) throw new Error('All teacher and school fields are required.');
    if (!['teacher', 'headmaster'].includes(role)) throw new Error('Invalid teacher role.');
    if (password.length < 8) throw new Error('Temporary password must contain at least 8 characters.');

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: school } = await admin.from('schools').select('id').eq('id', schoolId).maybeSingle();
    if (!school) throw new Error('Selected school does not exist.');
    const { data: created, error: createError } = await admin.auth.admin.createUser({ email: email.trim(), password, email_confirm: true, user_metadata: { full_name: fullName.trim() } });
    if (createError) throw createError;
    const teacherId = created.user.id;
    const { error: profileError } = await admin.from('profiles').upsert({ id: teacherId, email: email.trim(), full_name: fullName.trim(), role, school_id: schoolId, status: 'active' });
    if (profileError) { await admin.auth.admin.deleteUser(teacherId); throw profileError; }
    const { error: assignmentError } = await admin.from('school_assignments').upsert({ user_id: teacherId, school_id: schoolId }, { onConflict: 'user_id,school_id' });
    if (assignmentError) { await admin.auth.admin.deleteUser(teacherId); throw assignmentError; }
    await admin.from('audit_logs').insert({ user_id: caller.id, school_id: schoolId, action: 'teacher_account_created', details: { teacher_id: teacherId, full_name: fullName.trim(), email: email.trim(), role } });
    return Response.json({ success: true, teacher: { id: teacherId, fullName: fullName.trim(), email: email.trim(), schoolId, role } }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ success: false, message: error.message || 'Unable to create teacher account.' }, { status: 400, headers: corsHeaders });
  }
});
