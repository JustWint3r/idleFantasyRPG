import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { usePlayer } from '../../context/PlayerContext';
import {
  fetchSummonState,
  summonPull,
  type SummonPullResult,
  type SummonEvent,
  type SummonStatePayload,
} from '../../services/summonService';

export default function SummonScreen() {
  const { token } = useAuth();
  const { currencies, setCurrencies } = usePlayer();
  const currenciesRef = useRef(currencies);

  const [events, setEvents] = useState<SummonEvent[]>([]);
  const [eventStates, setEventStates] = useState<Record<string, SummonStatePayload>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [popup, setPopup] = useState<{ eventName: string; results: SummonPullResult[] } | null>(null);

  useEffect(() => {
    currenciesRef.current = currencies;
  }, [currencies]);

  const applyServerCurrencies = useCallback(
    (next: { gold: number; diamonds: number; summonScrolls: number }) => {
      const current = currenciesRef.current;
      setCurrencies({
        ...current,
        gold: next.gold,
        diamonds: next.diamonds,
        summonScrolls: next.summonScrolls,
      });
    },
    [setCurrencies],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadSummonState() {
        if (!token) return;

        try {
          const data = await fetchSummonState(token);
          if (!isActive) return;

          setEvents(data.events);
          setEventStates(data.eventStates);
          applyServerCurrencies(data.currencies);
        } catch (error: any) {
          if (!isActive) return;
          Alert.alert('Summon State Error', error?.message ?? 'Failed to load summon state.');
        }
      }

      loadSummonState();

      return () => {
        isActive = false;
      };
    }, [token, applyServerCurrencies]),
  );

  const canSummonSingle = currencies.summonScrolls >= 1;
  const canSummonTen = currencies.summonScrolls >= 10;

  async function runSummon(count: 1 | 10, eventId: string) {
    if (!token) {
      Alert.alert('Not logged in', 'Please log in again to summon.');
      return;
    }

    setIsLoading(true);

    try {
      const data = await summonPull(token, count, eventId);

      setEventStates((prev) => ({
        ...prev,
        [eventId]: data.eventState,
      }));
      applyServerCurrencies(data.currencies);
      setPopup({
        eventName: data.event.name,
        results: data.results,
      });
    } catch (error: any) {
      Alert.alert('Summon Failed', error?.message ?? 'Unable to summon right now.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.frame}>
          {events.length === 0 ? (
            <View style={styles.emptyEvents}>
              <Text style={styles.emptyEventsText}>No active summon events right now.</Text>
            </View>
          ) : (
            events.map((event, index) => (
              <View key={event.id} style={styles.eventContainer}>
                {index > 0 && <View style={styles.sectionDivider} />}
                <EventSection
                  title={event.name}
                  isLoading={isLoading}
                  canSummonSingle={canSummonSingle}
                  canSummonTen={canSummonTen}
                  onSingle={() => runSummon(1, event.id)}
                  onTen={() => runSummon(10, event.id)}
                />
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {popup ? (
        <SummonPopup
          eventName={popup.eventName}
          results={popup.results}
          onContinue={() => setPopup(null)}
        />
      ) : null}
    </View>
  );
}

function EventSection({
  title,
  isLoading,
  canSummonSingle,
  canSummonTen,
  onSingle,
  onTen,
}: {
  title: string;
  isLoading: boolean;
  canSummonSingle: boolean;
  canSummonTen: boolean;
  onSingle: () => void;
  onTen: () => void;
}) {
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.posterWrap}>
        <View style={styles.posterInner}>
          <Text style={styles.posterTitle}>Characters Poster</Text>
          <Text style={styles.posterEvent}>{title}</Text>
          <Text style={styles.posterSub}>Pity tracked independently per event banner</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          style={[
            styles.summonButton,
            styles.summonButtonSingle,
            (!canSummonSingle || isLoading) && styles.summonButtonDisabled,
          ]}
          onPress={onSingle}
          disabled={!canSummonSingle || isLoading}
        >
          <Text style={styles.summonLabel}>Summon Button</Text>
        </Pressable>

        <Pressable
          style={[
            styles.summonButton,
            styles.summonButtonTen,
            (!canSummonTen || isLoading) && styles.summonButtonDisabled,
          ]}
          onPress={onTen}
          disabled={!canSummonTen || isLoading}
        >
          <Text style={styles.summonLabel}>Summon Button (10)</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SummonPopup({
  eventName,
  results,
  onContinue,
}: {
  eventName: string;
  results: SummonPullResult[];
  onContinue: () => void;
}) {
  const isTenPull = results.length === 10;

  return (
    <View style={styles.popupOverlay}>
      <View style={styles.popupCard}>
        <Text style={styles.popupTitle}>{eventName}</Text>
        <Text style={styles.popupSubtitle}>{isTenPull ? 'Summon x10 Result' : 'Summon Result'}</Text>

        <View style={[styles.resultGrid, isTenPull ? styles.resultGridTen : styles.resultGridSingle]}>
          {results.map((result, index) => (
            <View
              key={`${result.character.id}-${index}`}
              style={[
                styles.resultTile,
                isTenPull ? styles.resultTileTen : styles.resultTileSingle,
              ]}
            >
              <Text style={styles.resultName}>{result.character.name}</Text>
              <RarityTag rarity={result.character.rarity} />
            </View>
          ))}
        </View>

        <Pressable style={styles.continueButton} onPress={onContinue}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RarityTag({ rarity }: { rarity: SummonPullResult['character']['rarity'] }) {
  const colors = {
    S: '#F5C842',
    A: '#60A5FA',
    B: '#9B96B8',
  } as const;

  return (
    <View style={[styles.rarityTag, { borderColor: colors[rarity] }]}>
      <Text style={[styles.rarityTagText, { color: colors[rarity] }]}>{rarity}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0F0E1A',
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 20,
  },
  frame: {
    borderWidth: 1,
    borderColor: '#2D2A45',
    borderRadius: 18,
    backgroundColor: '#151327',
    padding: 12,
    gap: 14,
  },
  eventContainer: {
    gap: 14,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#2D2A45',
  },
  posterWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2D2A45',
    backgroundColor: '#1A1730',
    padding: 8,
  },
  posterInner: {
    minHeight: 175,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#5B557D',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18152A',
    paddingHorizontal: 16,
    gap: 6,
  },
  posterTitle: {
    color: '#EDE8FF',
    fontSize: 26,
    fontWeight: '800',
  },
  posterEvent: {
    color: '#BFB9DA',
    fontSize: 22,
    fontWeight: '700',
  },
  posterSub: {
    color: '#8D87AA',
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summonButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summonButtonSingle: {
    borderColor: '#4D466B',
    backgroundColor: '#1F1B35',
  },
  summonButtonTen: {
    borderColor: '#6A5A2A',
    backgroundColor: '#2A2415',
  },
  summonButtonDisabled: {
    opacity: 0.45,
  },
  summonLabel: {
    color: '#EDE8FF',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyEvents: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D2A45',
    backgroundColor: '#18152A',
    padding: 16,
    alignItems: 'center',
  },
  emptyEventsText: {
    color: '#BFB9DA',
    fontSize: 14,
  },
  popupOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 7, 16, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  popupCard: {
    width: '100%',
    maxWidth: 760,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3A3559',
    backgroundColor: '#151327',
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  popupTitle: {
    color: '#EDE8FF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  popupSubtitle: {
    color: '#BFB9DA',
    fontSize: 13,
    textAlign: 'center',
  },
  resultGrid: {
    gap: 10,
  },
  resultGridSingle: {
    alignItems: 'center',
  },
  resultGridTen: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  resultTile: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#35304F',
    backgroundColor: '#1D1A33',
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  resultTileSingle: {
    width: '100%',
    maxWidth: 220,
  },
  resultTileTen: {
    width: '19%',
    minWidth: 110,
  },
  resultName: {
    color: '#EDE8FF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  rarityTag: {
    minWidth: 28,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
  },
  rarityTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  continueButton: {
    alignSelf: 'center',
    minWidth: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F5C842',
    backgroundColor: '#2A2415',
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#F5C842',
    fontSize: 15,
    fontWeight: '800',
  },
});
