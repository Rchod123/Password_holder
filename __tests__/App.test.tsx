/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@react-navigation/native-stack', () => {
  const React = require('react');
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({ children }: { children: React.ReactNode }) => children,
      Screen: () => null,
    }),
  };
});

jest.mock('react-native-biometrics', () => {
  return jest.fn().mockImplementation(() => ({
    isSensorAvailable: jest.fn().mockResolvedValue({ available: false }),
    simplePrompt: jest.fn().mockResolvedValue({ success: false }),
  }));
});

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
}));

jest.mock('react-native-quick-crypto', () => {
  const crypto = require('crypto');
  return {
    createCipheriv: crypto.createCipheriv,
    createDecipheriv: crypto.createDecipheriv,
    pbkdf2Sync: crypto.pbkdf2Sync,
    randomBytes: crypto.randomBytes,
  };
});

jest.mock('realm', () => {
  class MockRealm {
    static UpdateMode = { Modified: 'modified' };
    static open = jest.fn().mockResolvedValue(new MockRealm());
    objects() {
      return {
        sorted: () => ({
          map: () => [],
        }),
        filtered: () => [],
      };
    }
    write(callback: () => void) {
      callback();
    }
    create() {
      return undefined;
    }
    objectForPrimaryKey() {
      return null;
    }
    delete() {
      return undefined;
    }
  }

  return MockRealm;
});

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
