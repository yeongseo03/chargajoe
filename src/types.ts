export type Category = '전자기기' | '지갑·가방' | '의류·소품' | '기타';
export type FoundStatus = '보관 중' | '인계 완료';
export type CaseStatus = '접수' | '확인 중' | '안내 완료' | '종료';

export interface FoundItem {
  id: string;
  orgId: string;
  orgName: string;
  title: string;
  category: Category;
  description: string;
  foundAt: string;
  place: string;
  latitude: number;
  longitude: number;
  status: FoundStatus;
  photoUrl?: string | null;
  sample?: boolean;
}

export interface LostCase {
  id: string;
  caseType: '탐색' | '회수·배송';
  title: string;
  category: Category;
  lastSeenAt: string;
  lastSeenPlace: string;
  holdingPlace?: string;
  desiredAt?: string;
  description: string;
  status: CaseStatus;
  createdAt: string;
}

export interface Claim {
  id: string;
  itemId: string;
  itemTitle: string;
  message: string;
  status: '접수' | '확인 중' | '인계 승인' | '반려';
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  role: 'admin' | 'staff';
}

export const CATEGORIES: Category[] = ['전자기기', '지갑·가방', '의류·소품', '기타'];

export const CATEGORY_ICONS: Record<Category, string> = {
  전자기기: 'headset-outline',
  '지갑·가방': 'wallet-outline',
  '의류·소품': 'shirt-outline',
  기타: 'cube-outline',
};
