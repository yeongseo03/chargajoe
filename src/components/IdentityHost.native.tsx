import React from 'react';
import { Text, View } from 'react-native';
import { s } from '../ui';

export default function IdentityHost() {
  return <View style={s.page}><Text style={s.pageTitle}>본인확인</Text><Text style={s.pageSub}>내 정보에서 본인확인을 시작해 주세요.</Text></View>;
}
