import React, { useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { streamChat, routeModel, type ChatMessage, type WeatherContext, buildWeatherContext } from '@/src/api/openai'
import { usePremiumStore, MAX_DAILY_QUERIES } from '@/src/store/premiumStore'
import {
  ACCENT,
  BG,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_TERTIARY,
  ON_PRIMARY,
  SURFACE_CONTAINER,
} from '@/src/theme/colors'
import { FONT_BOLD } from '@/src/theme/typography'
import GlassCard from '@/src/components/shared/GlassCard'

const QUICK_CHIPS = [
  'Should I go for a run today?',
  "What's the UV like this afternoon?",
  'Any storms coming this week?',
  'Best time for outdoor exercise?',
]

interface AIChatSheetProps {
  weatherCtx: WeatherContext
}

interface Message extends ChatMessage {
  id: string
}

export default function AIChatSheet({ weatherCtx }: AIChatSheetProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const { canQuery, incrementQuery, queriesUsedToday, showPaywall } = usePremiumStore()

  const contextStr = buildWeatherContext(weatherCtx)

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return
      if (!canQuery()) {
        showPaywall()
        return
      }

      const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim() }
      const assistantId = (Date.now() + 1).toString()
      const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '' }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setInput('')
      setIsStreaming(true)
      await incrementQuery()

      try {
        const history: ChatMessage[] = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }))

        await streamChat(history, contextStr, routeModel('chat'), (token) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + token } : m)),
          )
          scrollRef.current?.scrollToEnd({ animated: true })
        })
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'Sorry, something went wrong. Please try again.' }
              : m,
          ),
        )
      } finally {
        setIsStreaming(false)
      }
    },
    [messages, isStreaming, canQuery, incrementQuery, contextStr, showPaywall],
  )

  const remaining = MAX_DAILY_QUERIES - queriesUsedToday
  const showNudge = remaining <= Math.ceil(MAX_DAILY_QUERIES * 0.1)

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="chatbubble-ellipses-outline" size={18} color={ACCENT} />
        <Text style={styles.title}>AI Weather Assistant</Text>
        {showNudge && (
          <Text style={styles.nudge}>{remaining}/{MAX_DAILY_QUERIES} left today</Text>
        )}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {messages.length === 0 ? (
          <View style={styles.chips}>
            {QUICK_CHIPS.map((chip) => (
              <Pressable key={chip} style={styles.chip} onPress={() => send(chip)}>
                <Text style={styles.chipText}>{chip}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.messageList}
            contentContainerStyle={styles.messageContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((m) => (
              <View
                key={m.id}
                style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAI]}
              >
                <Text style={[styles.bubbleText, m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAI]}>
                  {m.content}
                  {isStreaming && m.role === 'assistant' && m === messages[messages.length - 1] && (
                    <Text style={styles.cursor}>▍</Text>
                  )}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your weather…"
            placeholderTextColor={TEXT_TERTIARY}
            returnKeyType="send"
            onSubmitEditing={() => send(input)}
            editable={!isStreaming}
          />
          <Pressable
            style={[styles.sendBtn, (!input.trim() || isStreaming) && styles.sendBtnDisabled]}
            onPress={() => send(input)}
            disabled={!input.trim() || isStreaming}
          >
            {isStreaming ? (
              <ActivityIndicator size="small" color={ON_PRIMARY} />
            ) : (
              <Ionicons name="arrow-up" size={18} color={ON_PRIMARY} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </GlassCard>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...FONT_BOLD,
    fontSize: 15,
    color: TEXT_PRIMARY,
    flex: 1,
  },
  nudge: {
    fontSize: 11,
    color: TEXT_TERTIARY,
  },
  chips: {
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(74,158,255,0.10)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(74,158,255,0.22)',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  messageList: {
    maxHeight: 260,
  },
  messageContent: {
    gap: 8,
    paddingBottom: 4,
  },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '85%',
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: ACCENT,
  },
  bubbleAI: {
    alignSelf: 'flex-start',
    backgroundColor: SURFACE_CONTAINER,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: ON_PRIMARY,
  },
  bubbleTextAI: {
    color: TEXT_PRIMARY,
  },
  cursor: {
    color: ACCENT,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BG,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: TEXT_PRIMARY,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
})
