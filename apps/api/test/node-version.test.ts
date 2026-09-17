import { describe, expect, it } from 'vitest';
import { assertSupportedNodeVersion } from '../src/node-version';

describe('assertSupportedNodeVersion', () => {
  it('accepts the version this project pins', () => {
    expect(() => {
      assertSupportedNodeVersion('24.11.0');
    }).not.toThrow();
  });

  it('accepts a version newer than the one this project pins', () => {
    expect(() => {
      assertSupportedNodeVersion('25.0.0');
    }).not.toThrow();
  });

  it('rejects the version whose node:sqlite is missing setReturnArrays', () => {
    expect(() => {
      assertSupportedNodeVersion('23.11.0');
    }).toThrow(/needs Node 24 or newer/);
  });

  it('tells the reader to run nvm use', () => {
    expect(() => {
      assertSupportedNodeVersion('23.11.0');
    }).toThrow(/nvm use/);
  });

  it('reports the version it actually found', () => {
    expect(() => {
      assertSupportedNodeVersion('22.18.0');
    }).toThrow(/22\.18\.0/);
  });

  it('refuses a version string it cannot read', () => {
    expect(() => {
      assertSupportedNodeVersion('not-a-version');
    }).toThrow(/Could not read the Node version/);
  });
});
