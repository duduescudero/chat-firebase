import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ChatMessage } from '../types/chat';
import { formatTime } from '../utils/date';
import { colors } from '../utils/theme';

type Props = {
  message: ChatMessage;
  isMine: boolean;
  authorName: string;
  showAuthor: boolean;
  targetName: string | null;
};

function ChatMessageItemComponent({ message, isMine, authorName, showAuthor, targetName }: Props) {
  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowOther]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        {showAuthor && !isMine ? <Text style={styles.author}>{authorName}</Text> : null}
        {targetName ? (
          <Text style={[styles.target, isMine && styles.textMine]}>Para @{targetName}</Text>
        ) : null}
        <Text style={[styles.text, isMine && styles.textMine]}>{message.text}</Text>
        <Text style={[styles.time, isMine && styles.timeMine]}>{formatTime(message.createdAt)}</Text>
      </View>
    </View>
  );
}

export const ChatMessageItem = memo(ChatMessageItemComponent);

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, paddingVertical: 3, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: colors.bubbleMine, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.bubbleOther, borderBottomLeftRadius: 4 },
  author: { fontWeight: '700', color: colors.primaryDark, marginBottom: 2, fontSize: 12 },
  target: { fontSize: 12, fontStyle: 'italic', color: colors.textMuted, marginBottom: 2 },
  text: { color: colors.text, fontSize: 15 },
  textMine: { color: '#fff' },
  time: { alignSelf: 'flex-end', marginTop: 2, fontSize: 10, color: colors.textMuted },
  timeMine: { color: '#dbeafe' },
});
