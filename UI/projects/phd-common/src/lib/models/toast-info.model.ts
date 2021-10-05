export interface IToastInfo {
  severity: 'success' | 'error' | 'info' | 'warn';
  summary: string;
  detail: string;
  sticky?: boolean;
}
