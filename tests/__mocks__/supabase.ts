export const mockSupabaseAuth = {
  getSession: jest.fn(),
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  setSession: jest.fn(),
  exchangeCodeForSession: jest.fn(),
  updateUser: jest.fn(),
  onAuthStateChange: jest.fn(() => ({
    data: { subscription: { unsubscribe: jest.fn() } },
  })),
  signOut: jest.fn(),
};

export const mockSupabaseUsersTable = {
  upsert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
};

export const mockSupabaseClient = {
  auth: mockSupabaseAuth,
  from: jest.fn((_table?: string) => mockSupabaseUsersTable),
};

export function resetSupabaseMocks() {
  mockSupabaseAuth.getSession.mockReset();
  mockSupabaseAuth.signInWithPassword.mockReset();
  mockSupabaseAuth.signUp.mockReset();
  mockSupabaseAuth.resetPasswordForEmail.mockReset();
  mockSupabaseAuth.setSession.mockReset();
  mockSupabaseAuth.exchangeCodeForSession.mockReset();
  mockSupabaseAuth.updateUser.mockReset();
  mockSupabaseAuth.onAuthStateChange.mockReset();
  mockSupabaseAuth.onAuthStateChange.mockImplementation(() => ({
    data: { subscription: { unsubscribe: jest.fn() } },
  }));
  mockSupabaseAuth.signOut.mockReset();
  mockSupabaseUsersTable.upsert.mockClear();
  mockSupabaseUsersTable.select.mockClear();
  mockSupabaseUsersTable.eq.mockClear();
  mockSupabaseUsersTable.single.mockClear();
  mockSupabaseClient.from.mockClear();
}
