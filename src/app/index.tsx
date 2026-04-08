import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFonts } from 'expo-font';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { loginPlayer, registerPlayer } from '../services/authService';

const { width, height } = Dimensions.get('window');

// ── Colours ───────────────────────────────────────────────────

const C = {
  bg: '#0F0E1A',
  surface: '#1A1830',
  border: '#2E2A50',
  textPrimary: '#EDE8FF',
  textMuted: '#9B96B8',
  purple: '#7C5CBF',
  red: '#FF6B6B',
  input: '#1C1A2E',
  inputBorder: '#2D2A45',
} as const;


// ── Login / Register modal ────────────────────────────────────

function AuthModal({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { setAuth } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleModeSwitch(next: 'login' | 'register') {
    setMode(next);
    setError('');
  }

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data =
        mode === 'login'
          ? await loginPlayer(email.trim(), password)
          : await registerPlayer(email.trim(), password);
      setAuth(data.token, data.player);
      onSuccess();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalWrapper}
        >
          {/* Stop tap-through to backdrop */}
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Welcome Back to Fantasy RPG</Text>

            {/* Log In / Sign Up toggle */}
            <View style={styles.modeRow}>
              <Pressable
                style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
                onPress={() => handleModeSwitch('login')}
              >
                <Text
                  style={[
                    styles.modeBtnText,
                    mode === 'login' && styles.modeBtnTextActive,
                  ]}
                >
                  Log In
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modeBtn, mode === 'register' && styles.modeBtnActive]}
                onPress={() => handleModeSwitch('register')}
              >
                <Text
                  style={[
                    styles.modeBtnText,
                    mode === 'register' && styles.modeBtnTextActive,
                  ]}
                >
                  Sign Up
                </Text>
              </Pressable>
            </View>

            {/* Username / Email */}
            <Text style={styles.fieldLabel}>Username:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#6B6880"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Password */}
            <Text style={styles.fieldLabel}>Password:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#6B6880"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* Submit */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {mode === 'login' ? 'Log In' : 'Sign Up'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Social login placeholders */}
            <View style={styles.socialRow}>
              <Pressable style={styles.socialBtn}>
                <Text style={styles.socialBtnText}>G</Text>
              </Pressable>
              <Pressable style={styles.socialBtn}>
                <Text style={styles.socialBtnText}>F</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ── Tap to begin animated text ────────────────────────────────

function TapToContinue() {
  const opacity = useRef(new Animated.Value(0)).current;
  const blur = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(blur, { toValue: 0, duration: 1800, useNativeDriver: true }),
        ]),
        Animated.delay(1000),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
          Animated.timing(blur, { toValue: 10, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.delay(400),
      ])
    ).start();
  }, []);

  return (
    <Animated.Text
      style={[
        styles.tapText,
        { opacity },
      ]}
    >
      Tap Anywhere to Begin
    </Animated.Text>
  );
}

// ── Landing screen ────────────────────────────────────────────

export default function LandingScreen() {
  const { token, isLoaded } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [fontsLoaded] = useFonts({
    'SirinStencil': require('../../assets/fonts/SirinStencil-Regular.ttf'),
  });

  useEffect(() => {
    if (isLoaded && token) {
      router.replace('/(tabs)/farm');
    }
  }, [isLoaded, token]);

  if (!isLoaded || token || !fontsLoaded) return null;

  return (
    <Pressable style={styles.landing} onPress={() => setShowModal(true)}>
      <Image
        source={require('../../assets/idleFantasyRPGLogo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <TapToContinue />

      <AuthModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => router.replace('/(tabs)/farm')}
      />
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Landing
  landing: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: height * 0.08,
  },
  logo: {
    width: width * 0.8,
    height: height * 0.35,
    marginBottom: 4,
  },
  tapText: {
    fontFamily: 'SirinStencil',
    fontSize: 22,
    color: '#C8A96E',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 220,
  },

  // Modal backdrop
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'flex-end',
  },
  modalWrapper: {
    width: '100%',
  },
  modalCard: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  modalTitle: {
    color: C.textPrimary,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },

  // Mode toggle
  modeRow: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: C.purple,
  },
  modeBtnText: {
    color: C.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  modeBtnTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // Fields
  fieldLabel: {
    color: C.textMuted,
    fontSize: 13,
    marginBottom: -4,
  },
  input: {
    width: '100%',
    backgroundColor: C.input,
    color: C.textPrimary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    borderWidth: 1,
    borderColor: C.inputBorder,
  },
  error: {
    color: C.red,
    fontSize: 13,
    textAlign: 'center',
  },

  // Submit
  submitBtn: {
    width: '100%',
    backgroundColor: C.purple,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Social
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  socialBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnText: {
    color: C.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
