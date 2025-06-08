import { greeting } from './greeting';

describe('greeting', () => {
  it('should return a greeting message', () => {
    const result = greeting('Test App');
    expect(result).toBe('Hello from Test App!');
  });

  it('should handle empty string', () => {
    const result = greeting('');
    expect(result).toBe('Hello from !');
  });
});