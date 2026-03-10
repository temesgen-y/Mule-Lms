'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { StudyGroup, StudyGroupInvitation } from '@/types/study-groups';

export function useStudyGroups(userId: string | null) {
  const [myGroups, setMyGroups] = useState<StudyGroup[]>([]);
  const [invitations, setInvitations] = useState<StudyGroupInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: allGroups, error: groupsErr } = await supabase
      .from('study_groups')
      .select(`
        id, name, description, is_active,
        created_by, created_at, updated_at, offering_id,
        course_offerings (
          courses ( code, title )
        ),
        study_group_members (
          id, student_id, role, status,
          users!fk_sgm_student ( id, first_name, last_name, avatar_url )
        )
      `)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (groupsErr) {
      setError(groupsErr.message);
      setLoading(false);
      return;
    }

    const mine = ((allGroups ?? []) as StudyGroup[]).filter(g =>
      g.study_group_members?.some(
        m => m.student_id === userId && m.status === 'active'
      )
    );
    setMyGroups(mine);

    const { data: invites, error: invErr } = await supabase
      .from('study_group_members')
      .select(`
        id, group_id, role, status, invited_by, joined_at,
        study_groups (
          id, name, offering_id,
          course_offerings (
            courses ( code, title )
          )
        ),
        inviter:users!fk_sgm_invited_by ( first_name, last_name )
      `)
      .eq('student_id', userId)
      .eq('status', 'invited');

    if (!invErr) setInvitations((invites ?? []) as unknown as StudyGroupInvitation[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const createGroup = useCallback(async (
    offeringId: string,
    name: string,
    description: string | null,
  ): Promise<StudyGroup> => {
    if (!userId) throw new Error('Not authenticated');
    const supabase = createClient();

    const { data: group, error: gErr } = await supabase
      .from('study_groups')
      .insert({ offering_id: offeringId, created_by: userId, name, description })
      .select()
      .single();
    if (gErr) throw new Error(gErr.message);

    await supabase.from('study_group_members').insert({
      group_id: (group as StudyGroup).id,
      student_id: userId,
      role: 'owner',
      status: 'active',
    });

    await loadGroups();
    return group as StudyGroup;
  }, [userId, loadGroups]);

  const leaveGroup = useCallback(async (groupId: string) => {
    if (!userId) throw new Error('Not authenticated');
    const supabase = createClient();
    const { error: err } = await supabase
      .from('study_group_members')
      .update({ status: 'left' })
      .eq('group_id', groupId)
      .eq('student_id', userId);
    if (err) throw new Error(err.message);
    await loadGroups();
  }, [userId, loadGroups]);

  const acceptInvitation = useCallback(async (groupId: string) => {
    if (!userId) throw new Error('Not authenticated');
    const supabase = createClient();
    const { error: err } = await supabase
      .from('study_group_members')
      .update({ status: 'active', joined_at: new Date().toISOString() })
      .eq('group_id', groupId)
      .eq('student_id', userId);
    if (err) throw new Error(err.message);
    await loadGroups();
  }, [userId, loadGroups]);

  const declineInvitation = useCallback(async (groupId: string) => {
    if (!userId) throw new Error('Not authenticated');
    const supabase = createClient();
    const { error: err } = await supabase
      .from('study_group_members')
      .update({ status: 'left' })
      .eq('group_id', groupId)
      .eq('student_id', userId);
    if (err) throw new Error(err.message);
    await loadGroups();
  }, [userId, loadGroups]);

  return {
    myGroups,
    invitations,
    loading,
    error,
    createGroup,
    leaveGroup,
    acceptInvitation,
    declineInvitation,
    reload: loadGroups,
  };
}
