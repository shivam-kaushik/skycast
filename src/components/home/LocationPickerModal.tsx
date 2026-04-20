import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import GlassCard from '@/src/components/shared/GlassCard'
import { searchLocations, type LocationSearchResult } from '@/src/api/locationSearch'
import type { SavedLocation } from '@/src/store/locationStore'
import { ACCENT, BG, GLASS_BORDER, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_TERTIARY } from '@/src/theme/colors'

interface LocationPickerModalProps {
  visible: boolean
  /** Label for the last known GPS place (not the manually selected city). */
  deviceCityName: string
  savedLocations: SavedLocation[]
  recentLocationIds: string[]
  onClose: () => void
  onUseDeviceLocation: () => void
  onSelectLocation: (location: LocationSearchResult) => void
  onToggleFavorite: (id: string) => void
}

function toSearchResult(location: SavedLocation): LocationSearchResult {
  return {
    id: location.id,
    cityName: location.cityName,
    lat: location.lat,
    lon: location.lon,
    country: location.country,
    admin1: location.admin1,
  }
}

export default function LocationPickerModal({
  visible,
  deviceCityName,
  savedLocations,
  recentLocationIds,
  onClose,
  onUseDeviceLocation,
  onSelectLocation,
  onToggleFavorite,
}: LocationPickerModalProps) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const latestRequestIdRef = useRef(0)
  const { height: windowHeight } = useWindowDimensions()
  const listMaxHeight = Math.max(220, Math.round(windowHeight * 0.48))

  const runSearch = (rawQuery: string): void => {
    const normalized = rawQuery.trim()
    if (normalized.length < 2) {
      setSearchResults([])
      setSearchError(null)
      setSearching(false)
      return
    }

    setSearching(true)
    setSearchError(null)
    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId
    void searchLocations(normalized)
      .then((results) => {
        if (latestRequestIdRef.current !== requestId) return
        setSearchResults(results)
      })
      .catch((error: unknown) => {
        if (latestRequestIdRef.current !== requestId) return
        const message = error instanceof Error ? error.message : 'Unable to search right now'
        setSearchError(message)
        setSearchResults([])
      })
      .finally(() => {
        if (latestRequestIdRef.current !== requestId) return
        setSearching(false)
      })
  }

  useEffect(() => {
    if (!visible) {
      setQuery('')
      setSearchResults([])
      setSearchError(null)
      setSearching(false)
      return
    }
    const timeoutId = setTimeout(() => {
      runSearch(query)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, visible])

  const favoriteLocations = useMemo(
    () => savedLocations.filter((location) => location.isFavorite),
    [savedLocations],
  )

  const recentLocations = useMemo(
    () =>
      recentLocationIds
        .map((id) => savedLocations.find((entry) => entry.id === id))
        .filter((entry): entry is SavedLocation => Boolean(entry)),
    [recentLocationIds, savedLocations],
  )

  const showSearch = query.trim().length >= 2

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.scrim}>
        <KeyboardAvoidingView
          style={styles.sheet}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.headerRow}>
            <Text style={styles.title}>Locations</Text>
            <Pressable testID="location-picker-close" style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={TEXT_SECONDARY} />
            </Pressable>
          </View>

          <GlassCard style={styles.searchCard}>
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={16} color={TEXT_TERTIARY} />
              <TextInput
                testID="location-picker-search"
                value={query}
                onChangeText={setQuery}
                placeholder="Search city or place"
                placeholderTextColor={TEXT_TERTIARY}
                returnKeyType="search"
                autoCorrect={false}
                onSubmitEditing={() => runSearch(query)}
                style={styles.searchInput}
              />
            </View>
          </GlassCard>

          <ScrollView
            style={[styles.list, { maxHeight: listMaxHeight }]}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            <Pressable
              style={styles.deviceRow}
              onPress={() => {
                onUseDeviceLocation()
                onClose()
              }}
            >
              <View style={styles.locationMain}>
                <Ionicons name="locate" size={16} color={ACCENT} />
                <View>
                  <Text style={styles.locationName}>Use current location</Text>
                  <Text style={styles.locationMeta}>
                    {deviceCityName.trim() || 'Your GPS location'}
                  </Text>
                </View>
              </View>
            </Pressable>

            {!showSearch && query.trim().length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Search</Text>
                <Text style={styles.emptyText}>Type at least 2 letters</Text>
              </View>
            ) : null}

            {showSearch ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Search Results</Text>
                {searching && (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={ACCENT} />
                    <Text style={styles.loadingText}>Searching…</Text>
                  </View>
                )}
                {!searching && searchError && <Text style={styles.emptyText}>{searchError}</Text>}
                {!searching && !searchError && searchResults.length === 0 && (
                  <Text style={styles.emptyText}>No matching locations found for "{query.trim()}"</Text>
                )}
                {searchResults.map((result) => (
                  <Pressable
                    key={`result-${result.id}`}
                    style={styles.locationRow}
                    onPress={() => {
                      onSelectLocation(result)
                      onClose()
                    }}
                  >
                    <View style={styles.locationMain}>
                      <Ionicons name="location-outline" size={16} color={TEXT_SECONDARY} />
                      <View>
                        <Text style={styles.locationName}>{result.cityName}</Text>
                        <Text style={styles.locationMeta}>
                          {[result.admin1, result.country].filter(Boolean).join(', ') || 'Saved location'}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Favorites</Text>
                  {favoriteLocations.length === 0 && (
                    <Text style={styles.emptyText}>Star locations from search or history</Text>
                  )}
                  {favoriteLocations.map((location) => (
                    <View key={`favorite-${location.id}`} style={styles.locationRow}>
                      <Pressable
                        style={styles.locationMain}
                        onPress={() => {
                          onSelectLocation(toSearchResult(location))
                          onClose()
                        }}
                      >
                        <Ionicons name="star" size={16} color="#FFD166" />
                        <View>
                          <Text style={styles.locationName}>{location.cityName}</Text>
                          <Text style={styles.locationMeta}>
                            {[location.admin1, location.country].filter(Boolean).join(', ') || 'Favorite'}
                          </Text>
                        </View>
                      </Pressable>
                      <Pressable onPress={() => onToggleFavorite(location.id)} style={styles.starBtn}>
                        <Ionicons name="star" size={16} color="#FFD166" />
                      </Pressable>
                    </View>
                  ))}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Recent</Text>
                  {recentLocations.length === 0 && (
                    <Text style={styles.emptyText}>No recent locations yet</Text>
                  )}
                  {recentLocations.map((location) => (
                    <View key={`recent-${location.id}`} style={styles.locationRow}>
                      <Pressable
                        style={styles.locationMain}
                        onPress={() => {
                          onSelectLocation(toSearchResult(location))
                          onClose()
                        }}
                      >
                        <Ionicons name="time-outline" size={16} color={TEXT_SECONDARY} />
                        <View>
                          <Text style={styles.locationName}>{location.cityName}</Text>
                          <Text style={styles.locationMeta}>
                            {[location.admin1, location.country].filter(Boolean).join(', ') || 'Recent location'}
                          </Text>
                        </View>
                      </Pressable>
                      <Pressable onPress={() => onToggleFavorite(location.id)} style={styles.starBtn}>
                        <Ionicons
                          name={location.isFavorite ? 'star' : 'star-outline'}
                          size={16}
                          color={location.isFavorite ? '#FFD166' : TEXT_TERTIARY}
                        />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(10,15,30,0.62)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: GLASS_BORDER,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  searchCard: {
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 14,
    paddingVertical: 0,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  deviceRow: {
    borderBottomWidth: 1,
    borderBottomColor: GLASS_BORDER,
    paddingVertical: 12,
  },
  section: {
    paddingTop: 12,
    gap: 2,
  },
  sectionTitle: {
    fontSize: 11,
    color: TEXT_TERTIARY,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  emptyText: {
    color: TEXT_TERTIARY,
    fontSize: 13,
    paddingBottom: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  locationMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  locationName: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600',
  },
  locationMeta: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 1,
  },
  starBtn: {
    padding: 8,
    marginLeft: 8,
  },
})
