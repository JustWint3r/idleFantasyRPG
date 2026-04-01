import { View, Text, StyleSheet } from 'react-native';
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Realm Idle RPG</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F0E1A' },
  text: { color: '#EDE8FF', fontSize: 24, fontWeight: '600' },
});
