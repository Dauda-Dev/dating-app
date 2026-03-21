import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Alert, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchPendingSteals } from '../../store/slices/stealSlice';
import { COLORS } from '../../constants';

export const StealsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { incomingRequests, isLoading } = useAppSelector((s) => s.steals);

  useEffect(() => { dispatch(fetchPendingSteals()); }, []);

  return (
    <View style={styles.screen}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>⚡ Steal Requests</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={incomingRequests}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => dispatch(fetchPendingSteals())} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>⚡</Text>
              <Text style={styles.emptyText}>No pending steal requests</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.requester?.profilePhoto ? (
              <Image source={{ uri: item.requester.profilePhoto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={{ fontSize: 24 }}>👤</Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.name}>
                {item.requester?.firstName} {item.requester?.lastName}
              </Text>
              {item.message ? <Text style={styles.message}>"{item.message}"</Text> : null}
              <Text style={styles.expires}>
                Expires {new Date(item.expiresAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.btnGroup}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => Alert.alert('Accepted', 'Steal request accepted!')}
              >
                <Text style={styles.acceptText}>✓</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => Alert.alert('Declined', 'Steal request declined.')}
              >
                <Text style={styles.rejectText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  back: { color: COLORS.primary, fontSize: 16, width: 60 },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.black },
  list: { padding: 16, paddingBottom: 48 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyText: { color: COLORS.gray, fontSize: 15 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: { backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.black },
  message: { fontSize: 13, color: COLORS.gray, fontStyle: 'italic', marginTop: 2 },
  expires: { fontSize: 11, color: COLORS.gray, marginTop: 3 },
  btnGroup: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  acceptBtn: { backgroundColor: COLORS.success },
  rejectBtn: { backgroundColor: COLORS.danger },
  acceptText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  rejectText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
