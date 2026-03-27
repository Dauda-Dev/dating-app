import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMatches } from '../../store/slices/matchSlice';
import { COLORS, MATCH_STATUS_CONFIG } from '../../constants';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { Match } from '../../types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export const MatchesScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const { user } = useAppSelector((s) => s.auth);
  const { matches, isLoading } = useAppSelector((s) => s.matches);

  useFocusEffect(
    useCallback(() => { dispatch(fetchMatches()); }, [])
  );

  const getPartner = (match: Match) => {
    if (!user) return null;
    return match.user1Id === user.id ? match.User2 : match.User1;
  };

  const active = matches.filter((m) => m.status !== 'broken');
  const broken = matches.filter((m) => m.status === 'broken');

  const renderMatch = ({ item }: { item: Match }) => {
    const partner = getPartner(item);
    const config = MATCH_STATUS_CONFIG[item.status];
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('MatchDetails', { matchId: item.id })}
        activeOpacity={0.85}
      >
        {partner?.profilePhoto ? (
          <Image source={{ uri: partner.profilePhoto }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={{ fontSize: 28 }}>👤</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name}>{partner?.firstName} {partner?.lastName}</Text>
          <Text style={[styles.status, { color: config?.color }]}>{config?.label}</Text>
          {item.compatibilityScore != null && (
            <Text style={styles.compat}>⚡ {item.compatibilityScore}% compatible</Text>
          )}
        </View>
        <View style={styles.action}>
          {config?.action ? (
            <Text style={[styles.actionLabel, { color: config.color }]}>{config.action}</Text>
          ) : null}
          <Text style={styles.arrow}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>My Matches 💘</Text>
      <FlatList
        data={active}
        keyExtractor={(m) => m.id}
        renderItem={renderMatch}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => dispatch(fetchMatches())} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💘</Text>
              <Text style={styles.emptyText}>No matches yet!</Text>
              <Text style={styles.emptyHint}>Start swiping in Discover to find matches.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          broken.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>Past Connections</Text>
              {broken.map((m) => (
                <View key={m.id}>
                  {renderMatch({ item: m })}
                </View>
              ))}
            </>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.black, padding: 20, paddingTop: 56 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: {
    backgroundColor: COLORS.lightGray,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1, marginLeft: 14 },
  name: { fontSize: 16, fontWeight: '600', color: COLORS.black },
  status: { fontSize: 12, marginTop: 3 },
  compat: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  action: { alignItems: 'flex-end' },
  actionLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  arrow: { fontSize: 24, color: COLORS.lightGray },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.black },
  emptyHint: { color: COLORS.gray, marginTop: 6, textAlign: 'center' },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: COLORS.gray, marginVertical: 12 },
});
