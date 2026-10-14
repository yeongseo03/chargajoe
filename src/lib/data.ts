import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import type { Category, Claim, FoundItem, LostCase, Organization } from '../types';

const sample = (id: string, title: string, category: Category, place: string, latitude: number, longitude: number, orgName: string): FoundItem => ({
  id, title, category, place, latitude, longitude, orgName, orgId: 'demo-org',
  description: '제휴 장소에서 보관 중인 물건의 예시입니다. 실제 운영 데이터가 아닙니다.',
  foundAt: '2026-10-12T12:00:00+09:00', status: '보관 중', sample: true,
});

export const DEMO_ITEMS: FoundItem[] = [
  sample('demo-1', '검은색 무선 이어폰', '전자기기', '을지로입구역 인근', 37.5662, 126.9824, '제휴 장소 예시'),
  sample('demo-2', '갈색 카드지갑', '지갑·가방', '시청역 인근', 37.5659, 126.9776, '제휴 장소 예시'),
  sample('demo-3', '베이지색 에코백', '지갑·가방', '명동역 인근', 37.5608, 126.9859, '제휴 장소 예시'),
  sample('demo-4', '은색 텀블러', '기타', '광화문역 인근', 37.5716, 126.9769, '제휴 장소 예시'),
  sample('demo-5', '검은색 가디건', '의류·소품', '종각역 인근', 37.5701, 126.9830, '제휴 장소 예시'),
];

const parseItem = (row: any): FoundItem => ({
  id: row.id, orgId: row.org_id, orgName: row.organizations?.name || '보관 장소',
  title: row.title, category: row.category, description: row.description || '',
  foundAt: row.found_at, place: row.place, latitude: Number(row.latitude), longitude: Number(row.longitude),
  status: row.status, photoUrl: row.photo_url,
});

export async function listItems(): Promise<FoundItem[]> {
  if (!supabase) {
    const saved = await AsyncStorage.getItem('demo-items');
    return [...(saved ? JSON.parse(saved) as FoundItem[] : []), ...DEMO_ITEMS];
  }
  const { data, error } = await supabase.from('found_items')
    .select('*, organizations(name)').eq('visibility', 'public').order('found_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(parseItem);
}

export async function listMyCases(userId: string): Promise<LostCase[]> {
  if (!supabase) {
    const saved = await AsyncStorage.getItem('demo-cases');
    return saved ? JSON.parse(saved) : [];
  }
  const { data, error } = await supabase.from('lost_cases').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(parseCase);
}

const parseCase = (r: any): LostCase => ({ id: r.id, caseType: r.case_type, title: r.title, category: r.category,
  lastSeenAt: r.last_seen_at, lastSeenPlace: r.last_seen_place, holdingPlace: r.holding_place || undefined,
  desiredAt: r.desired_at || undefined, description: r.description || '', status: r.status, createdAt: r.created_at });

export async function createCase(userId: string, input: Omit<LostCase, 'id' | 'status' | 'createdAt'>): Promise<void> {
  if (!supabase) {
    const items = await listMyCases(userId);
    await AsyncStorage.setItem('demo-cases', JSON.stringify([{ ...input, id: `demo-${Date.now()}`, status: '접수', createdAt: new Date().toISOString() }, ...items]));
    return;
  }
  const { error } = await supabase.from('lost_cases').insert({ user_id: userId, case_type: input.caseType, title: input.title,
    category: input.category, last_seen_at: input.lastSeenAt, last_seen_place: input.lastSeenPlace,
    holding_place: input.holdingPlace || null, desired_at: input.desiredAt || null, description: input.description });
  if (error) throw error;
}

export async function listMyClaims(userId: string): Promise<Claim[]> {
  if (!supabase) {
    const saved = await AsyncStorage.getItem('demo-claims');
    return saved ? JSON.parse(saved) : [];
  }
  const { data, error } = await supabase.from('claims').select('*, found_items(title)').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((r: any) => ({ id: r.id, itemId: r.item_id, itemTitle: r.found_items?.title || '습득물',
    message: r.message, status: r.status, createdAt: r.created_at }));
}

export async function createClaim(userId: string, item: FoundItem, message: string): Promise<void> {
  if (!supabase) {
    const claims = await listMyClaims(userId);
    await AsyncStorage.setItem('demo-claims', JSON.stringify([{ id: `demo-${Date.now()}`, itemId: item.id,
      itemTitle: item.title, message, status: '접수', createdAt: new Date().toISOString() }, ...claims]));
    return;
  }
  const { error } = await supabase.from('claims').insert({ user_id: userId, item_id: item.id, message });
  if (error) throw error;
}

export async function getMyOrganization(userId: string): Promise<Organization | null> {
  if (!supabase) return { id: 'demo-org', name: '제휴 장소 체험', role: 'admin' };
  const { data, error } = await supabase.from('organization_members').select('org_id, role, organizations(name)')
    .eq('user_id', userId).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.org_id, role: data.role as Organization['role'], name: (data.organizations as any)?.name || '제휴 장소' };
}

export async function createFoundItem(org: Organization, userId: string, input: Omit<FoundItem, 'id' | 'orgId' | 'orgName' | 'status' | 'sample'>): Promise<void> {
  if (!supabase) {
    const current = await AsyncStorage.getItem('demo-items');
    const items: FoundItem[] = current ? JSON.parse(current) : [];
    await AsyncStorage.setItem('demo-items', JSON.stringify([{ ...input, id: `demo-${Date.now()}`, orgId: org.id,
      orgName: org.name, status: '보관 중' }, ...items]));
    return;
  }
  const { error } = await supabase.from('found_items').insert({ org_id: org.id, created_by: userId,
    title: input.title, category: input.category, description: input.description, found_at: input.foundAt,
    place: input.place, latitude: input.latitude, longitude: input.longitude, photo_url: input.photoUrl || null,
    visibility: 'pending' });
  if (error) throw error;
}

export async function listOrgItems(orgId: string): Promise<FoundItem[]> {
  if (!supabase) return (await listItems()).filter(x => x.orgId === orgId && !x.sample);
  const { data, error } = await supabase.from('found_items').select('*, organizations(name)').eq('org_id', orgId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(parseItem);
}

export async function updateItemStatus(id: string, status: FoundItem['status']): Promise<void> {
  if (!supabase) {
    const current = await AsyncStorage.getItem('demo-items');
    const items: FoundItem[] = current ? JSON.parse(current) : [];
    await AsyncStorage.setItem('demo-items', JSON.stringify(items.map(x => x.id === id ? { ...x, status } : x)));
    return;
  }
  const { error } = await supabase.from('found_items').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function listOrgClaims(orgId: string): Promise<Claim[]> {
  if (!supabase) return await listMyClaims('demo-user');
  const { data: items, error: itemsError } = await supabase.from('found_items').select('id').eq('org_id', orgId);
  if (itemsError) throw itemsError;
  const ids = (items || []).map((x: any) => x.id);
  if (!ids.length) return [];
  const { data, error } = await supabase.from('claims').select('*, found_items(title)').in('item_id', ids).order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((r: any) => ({ id: r.id, itemId: r.item_id, itemTitle: r.found_items?.title || '습득물', message: r.message,
    status: r.status, createdAt: r.created_at }));
}

export async function updateClaimStatus(id: string, status: Claim['status']): Promise<void> {
  if (!supabase) {
    const current = await AsyncStorage.getItem('demo-claims');
    const claims: Claim[] = current ? JSON.parse(current) : [];
    await AsyncStorage.setItem('demo-claims', JSON.stringify(claims.map(x => x.id === id ? { ...x, status } : x)));
    return;
  }
  const { error } = await supabase.from('claims').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function reportItem(userId: string, itemId: string, reason: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('item_reports').insert({ user_id: userId, item_id: itemId, reason });
  if (error) throw error;
}

export async function isPlatformStaff(userId: string): Promise<boolean> {
  if (!supabase) return true;
  const { data, error } = await supabase.from('platform_staff').select('user_id').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function listAllCases(): Promise<LostCase[]> {
  if (!supabase) return listMyCases('demo-user');
  const { data, error } = await supabase.from('lost_cases').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(parseCase);
}

export async function updateCaseStatus(id: string, status: LostCase['status']): Promise<void> {
  if (!supabase) {
    const current = await AsyncStorage.getItem('demo-cases');
    const cases: LostCase[] = current ? JSON.parse(current) : [];
    await AsyncStorage.setItem('demo-cases', JSON.stringify(cases.map(x => x.id === id ? { ...x, status } : x)));
    return;
  }
  const { error } = await supabase.from('lost_cases').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function listPendingItems(): Promise<FoundItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('found_items').select('*, organizations(name)').eq('visibility', 'pending').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(parseItem);
}

export async function setItemVisibility(id: string, visibility: 'public' | 'hidden'): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('found_items').update({ visibility }).eq('id', id);
  if (error) throw error;
}

export interface ItemReport { id: string; itemId: string; reason: string; createdAt: string }
export async function listReports(): Promise<ItemReport[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('item_reports').select('id, item_id, reason, created_at').eq('status', 'open').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((r: any) => ({ id: r.id, itemId: r.item_id, reason: r.reason, createdAt: r.created_at }));
}

export async function resolveReport(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('item_reports').update({ status: 'resolved' }).eq('id', id);
  if (error) throw error;
}
