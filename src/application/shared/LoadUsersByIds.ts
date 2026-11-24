import type { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import type { User } from '../../core/domain/user/User';

/** Batch database adapters can fetch contacts without one network round trip per person. */
export async function loadUsersByIds(repository: IUserRepository, ids: string[]): Promise<Map<string, User>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();
  const users = repository.findByIds
    ? await repository.findByIds(unique)
    : (await Promise.all(unique.map(id => repository.findById(id)))).filter((user): user is User => !!user);
  return new Map(users.map(user => [user.id, user]));
}
