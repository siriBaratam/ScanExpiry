// In-memory user storage for demo mode
const demoUsers = new Map();
let nextUserId = 1;

export function getDemoUsers() {
  return demoUsers;
}

export function addDemoUser(userData) {
  const id = nextUserId++;
  const user = { id, ...userData };
  demoUsers.set(userData.email, user);
  return user;
}

export function getDemoUser(email) {
  return demoUsers.get(email);
}
