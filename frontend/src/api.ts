const API_BASE = '/api';
const TOKEN_KEY = 'securebank_token';
const USER_KEY = 'securebank_user';
const ROLE_KEY = 'securebank_role';

export interface AuthResponse {
  token: string;
  username: string;
  role: string;
}

export interface Account {
  accountNumber: string;
  balance: number;
  frozen: boolean;
  createdAt: string;
}

export type TransactionType = 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'TRANSFER_IN' | 'TRANSFER_OUT';

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  fromAccountNumber: string | null;
  toAccountNumber: string | null;
  description: string | null;
  createdAt: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface LedgerBlock {
  id: number;
  blockIndex: number;
  userId: number | null;
  eventType: string;
  payloadHash: string;
  prevHash: string;
  blockHash: string;
  createdAt: string;
}

export interface VerifyResponse {
  valid: boolean;
  blocks: number;
  message: string;
}

export interface AdminStats {
  users: number;
  accounts: number;
  totalBalance: number;
  transactions: number;
  ledgerBlocks: number;
  chainValid: boolean;
  chainMessage: string;
  frozenAccounts: number;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  accountNumber: string | null;
  balance: number;
  frozen: boolean;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message ?? `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function register(username: string, email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password })
  });
}

export function login(username: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export function getAccount(token: string): Promise<Account> {
  return request<Account>('/account', { headers: authHeaders(token) });
}

export function deposit(token: string, amount: number, description?: string): Promise<Account> {
  return request<Account>('/account/deposit', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ amount, description })
  });
}

export function withdraw(token: string, amount: number, description?: string): Promise<Account> {
  return request<Account>('/account/withdraw', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ amount, description })
  });
}

export function transfer(
  token: string,
  toAccountNumber: string,
  amount: number,
  description?: string
): Promise<Account> {
  return request<Account>('/account/transfer', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ toAccountNumber, amount, description })
  });
}

export function getTransactions(token: string): Promise<Transaction[]> {
  return request<Transaction[]>('/account/transactions', { headers: authHeaders(token) });
}

export function getProfile(token: string): Promise<UserProfile> {
  return request<UserProfile>('/profile', { headers: authHeaders(token) });
}

export function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> {
  return request<{ message: string }>('/profile/change-password', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

export function getLoginHistory(token: string): Promise<LedgerBlock[]> {
  return request<LedgerBlock[]>('/profile/login-history', { headers: authHeaders(token) });
}

export function getLedger(token: string): Promise<LedgerBlock[]> {
  return request<LedgerBlock[]>('/ledger', { headers: authHeaders(token) });
}

export function verifyLedger(token: string): Promise<VerifyResponse> {
  return request<VerifyResponse>('/ledger/verify', { headers: authHeaders(token) });
}

export function getAdminStats(token: string): Promise<AdminStats> {
  return request<AdminStats>('/admin/stats', { headers: authHeaders(token) });
}

export function getAdminUsers(token: string): Promise<AdminUser[]> {
  return request<AdminUser[]>('/admin/users', { headers: authHeaders(token) });
}

export function getAdminTransactions(token: string): Promise<Transaction[]> {
  return request<Transaction[]>('/admin/transactions', { headers: authHeaders(token) });
}

export function setUserRole(token: string, userId: number, role: string): Promise<AdminUser> {
  return request<AdminUser>(`/admin/users/${userId}/role`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ role })
  });
}

export function setAccountFrozen(token: string, userId: number, frozen: boolean): Promise<AdminUser> {
  return request<AdminUser>(`/admin/users/${userId}/freeze`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ frozen })
  });
}

export function updateAdminUser(
  token: string,
  userId: number,
  payload: { username: string; email: string; role: string }
): Promise<AdminUser> {
  return request<AdminUser>(`/admin/users/${userId}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload)
  });
}

export function deleteAdminUser(token: string, userId: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/admin/users/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  });
}

export function saveSession(auth: AuthResponse): void {
  localStorage.setItem(TOKEN_KEY, auth.token);
  localStorage.setItem(USER_KEY, auth.username);
  localStorage.setItem(ROLE_KEY, auth.role);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUsername(): string | null {
  return localStorage.getItem(USER_KEY);
}

export function getRole(): string | null {
  return localStorage.getItem(ROLE_KEY);
}

export function isAdmin(): boolean {
  return getRole() === 'ROLE_ADMIN';
}

export function isLoggedIn(): boolean {
  return Boolean(getToken());
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}
