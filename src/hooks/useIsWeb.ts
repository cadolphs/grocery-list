// useIsWeb - platform detection hook.
// Returns true when running on web, false on iOS/Android.
// Platform.OS is constant at runtime, so this is safe as a plain function
// (no re-render concerns).

import { Platform } from 'react-native';

export const useIsWeb = (): boolean => Platform.OS === 'web';
