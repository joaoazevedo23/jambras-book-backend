import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'accessSecret';
      if (key === 'JWT_REFRESH_SECRET') return 'refreshSecret';
      return '15m';
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('deve registrar um novo usuário com sucesso', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-uuid',
        email: 'novo@teste.com',
        username: 'novouser',
        name: 'Novo Usuario',
        avatarUrl: null,
      });
      mockJwtService.signAsync.mockResolvedValue('mock-token');

      const result = await service.register({
        email: 'novo@teste.com',
        username: 'novouser',
        name: 'Novo Usuario',
        password: 'password123',
      });

      expect(result.user.email).toBe('novo@teste.com');
      expect(result.tokens.accessToken).toBe('mock-token');
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('deve lançar ConflictException se o e-mail já existir', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        email: 'novo@teste.com',
        username: 'outro',
      });

      await expect(
        service.register({
          email: 'novo@teste.com',
          username: 'novouser',
          name: 'Novo Usuario',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('deve realizar login com credenciais válidas', async () => {
      const passwordHash = await bcrypt.hash('password123', 10);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'user-uuid',
        email: 'teste@teste.com',
        username: 'testeuser',
        name: 'Teste User',
        passwordHash,
        avatarUrl: null,
      });
      mockJwtService.signAsync.mockResolvedValue('mock-token');

      const result = await service.login({
        login: 'teste@teste.com',
        password: 'password123',
      });

      expect(result.tokens).toBeDefined();
      expect(result.user.username).toBe('testeuser');
    });

    it('deve lançar UnauthorizedException com senha incorreta', async () => {
      const passwordHash = await bcrypt.hash('senhaCorreta', 10);
      mockPrismaService.user.findFirst.mockResolvedValue({
        passwordHash,
      });

      await expect(
        service.login({ login: 'teste@teste.com', password: 'senhaErrada' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
