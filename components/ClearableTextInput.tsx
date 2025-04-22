import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ClearableTextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: any;
  onClear: () => void;
  autoCorrect?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
}

const ClearableTextInput: React.FC<ClearableTextInputProps> = ({
  value,
  onChangeText,
  placeholder,
  style,
  onClear,
  autoCorrect,
  autoCapitalize,
  multiline,
}) => {
  return (
    <View style={[{ position: 'relative', width: '100%' }, style]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={[style, { paddingRight: 36 }]}
        autoCorrect={autoCorrect}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={onClear}
          style={{ position: 'absolute', right: 8, top: 0, bottom: 0, justifyContent: 'center', height: '100%' }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={22} color="#A0AEC0" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ClearableTextInput;
