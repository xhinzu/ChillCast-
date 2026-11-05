import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;

  try {
    // 1. Delete user row in profiles table
    await supabase.from('profiles').delete().eq('id', userId);

    // 2. Delete the user from auth.users via Supabase Admin API (service role)
    const admin = createAdminClient();
    if (admin) {
      const { error: adminDeleteError } = await admin.auth.admin.deleteUser(userId);
      if (adminDeleteError) {
        console.error('Failed to delete auth user via admin API:', adminDeleteError.message);
      }
    }

    // 3. Clear session
    await supabase.auth.signOut();

    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Account deletion error:', err);
    return NextResponse.json(
      { error: 'Failed to complete account deletion. Please try again.' },
      { status: 500 }
    );
  }
}

