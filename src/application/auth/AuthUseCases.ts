import { IUserRepository } from '../../core/ports/repositories/IUserRepository';
import { IAuthTokenService, IPasswordHasher } from '../../core/ports/services/IExternalServices';
import { User, UserRole, UserStatus } from '../../core/domain/user/User';
import { IdGenerator, ConflictError, UnauthorizedError, NotFoundError } from '../../core/domain/shared/Errors';

export interface RegisterUserDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  schoolId?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponseDTO {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    role: UserRole;
    phone?: string;
    schoolId?: string;
  };
}

export class AuthUseCases {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: IAuthTokenService
  ) {}

  public async register(dto: RegisterUserDTO): Promise<AuthResponseDTO> {
    const existing = await this.userRepository.findByEmail(dto.email.toLowerCase());
    if (existing) {
      throw new ConflictError(`User with email '${dto.email}' already exists.`);
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);
    const userId = IdGenerator.generate();

    const user = User.create(
      {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        phone: dto.phone,
        status: UserStatus.ACTIVE,
        schoolId: dto.schoolId
      },
      userId
    );

    await this.userRepository.save(user);

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId
    };

    const accessToken = this.tokenService.generateAccessToken(tokenPayload);
    const refreshToken = this.tokenService.generateRefreshToken(tokenPayload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        schoolId: user.schoolId
      }
    };
  }

  public async login(dto: LoginDTO): Promise<AuthResponseDTO> {
    const user = await this.userRepository.findByEmail(dto.email.toLowerCase());
    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError('Account is inactive or suspended.');
    }

    const isMatch = await this.passwordHasher.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId
    };

    const accessToken = this.tokenService.generateAccessToken(tokenPayload);
    const refreshToken = this.tokenService.generateRefreshToken(tokenPayload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        schoolId: user.schoolId
      }
    };
  }

  public async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedError('Invalid or expired refresh token.');
    }

    const user = await this.userRepository.findById(payload.userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError('User account not found or inactive.');
    }

    const newPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId
    };

    const accessToken = this.tokenService.generateAccessToken(newPayload);
    return { accessToken };
  }

  public async getProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    return user.toJSON();
  }
}
