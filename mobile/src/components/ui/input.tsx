import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type InputProps = TextInputProps & {
  label: string;
  error?: string;
};

export function Input({ label, error, secureTextEntry, style, onFocus, onBlur, ...rest }: InputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const isPassword = !!secureTextEntry;
  const borderColor = error ? theme.error : focused ? theme.primary : theme.inputBorder;

  return (
    <View style={styles.wrapper}>
      <ThemedText type="smallBold">{label}</ThemedText>

      <View
        style={[
          styles.field,
          { backgroundColor: theme.surface, borderColor, borderWidth: focused || error ? 2 : 1 },
        ]}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={isPassword && hidden}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, { color: theme.text }, style]}
          {...rest}
        />

        {isPassword && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}>
            <ThemedText type="smallBold" themeColor="primary">
              {hidden ? 'Show' : 'Hide'}
            </ThemedText>
          </Pressable>
        )}
      </View>

      {error ? (
        <ThemedText type="small" themeColor="error">
          ⚠ {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.two,
  },
  field: {
    height: 48,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
});